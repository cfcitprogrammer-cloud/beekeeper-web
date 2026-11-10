"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getActionContext,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions"
import { createClient } from "@/utils/supabase/server"

export async function uploadExpenseAttachment(
  formData: FormData
): Promise<ActionResult<{ id: string; fileName: string; storagePath: string }>> {
  const expenseId = String(formData.get("expenseId") ?? "")
  const file = formData.get("file")

  if (!expenseId) return failure("Expense id is required.")
  if (!(file instanceof File) || file.size === 0) {
    return failure("Select a file to upload.")
  }

  const context = await getActionContext()
  if (!context.userId) return failure("You must be signed in.")
  if (!context.companyId) return failure("No company is associated with your account.")
  if (
    !hasAnyPermission(context.permissions, [
      PERMISSIONS.EXPENSES_CREATE,
      PERMISSIONS.EXPENSES_UPDATE,
    ])
  ) {
    return failure("You do not have permission to upload expense attachments.")
  }

  const { supabase, companyId, userId } = context

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (expenseError) return failure(expenseError.message)
  if (!expense) return failure("Expense not found in this company.")

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${companyId}/${expenseId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from("expense-attachments")
    .upload(path, file, { upsert: false })

  if (uploadError) {
    console.error("[action:uploadExpenseAttachment:upload]", uploadError)
    return failure(uploadError.message)
  }

  const { data, error } = await supabase
    .from("expense_attachments")
    .insert({
      company_id: companyId,
      expense_id: expenseId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:uploadExpenseAttachment:insert]", error)
    await supabase.storage.from("expense-attachments").remove([path])
    return failure(error.message)
  }

  revalidatePath("/expenses/items")

  return {
    success: true,
    data: { id: data.id, fileName: file.name, storagePath: path },
  }
}

export async function deleteExpenseAttachment(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Attachment id is required.")

  const context = await getActionContext()
  if (!context.userId) return failure("You must be signed in.")
  if (!context.companyId) return failure("No company is associated with your account.")
  if (
    !hasAnyPermission(context.permissions, [
      PERMISSIONS.EXPENSES_UPDATE,
      PERMISSIONS.EXPENSES_DELETE,
    ])
  ) {
    return failure("You do not have permission to delete expense attachments.")
  }

  const { supabase, companyId } = context

  const { data, error } = await supabase
    .from("expense_attachments")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .select("storage_path")
    .single()

  if (error) {
    console.error("[action:deleteExpenseAttachment]", error)
    return failure(error.message)
  }

  if (data?.storage_path) {
    await supabase.storage.from("expense-attachments").remove([data.storage_path])
  }

  revalidatePath("/expenses/items")

  return { success: true, data: { id } }
}

export async function getExpenseAttachmentUrl(
  storagePath: string
): Promise<ActionResult<{ url: string }>> {
  if (!storagePath) return failure("File path is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_VIEW)
  if ("error" in authorized) return authorized.error

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from("expense-attachments")
    .createSignedUrl(storagePath, 60 * 5)

  if (error || !data?.signedUrl) {
    console.error("[action:getExpenseAttachmentUrl]", error)
    return failure(error?.message ?? "Could not generate download link.")
  }

  return { success: true, data: { url: data.signedUrl } }
}
