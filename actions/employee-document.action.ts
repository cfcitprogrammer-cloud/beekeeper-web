"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { createClient } from "@/utils/supabase/server"

export type UploadEmployeeDocumentInput = {
  employeeId: string
  name: string
  category?: string
  expiresOn?: string
}

export async function uploadEmployeeDocument(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const employeeId = String(formData.get("employeeId") ?? "")
  const name = String(formData.get("name") ?? "")
  const category = String(formData.get("category") ?? "")
  const expiresOn = String(formData.get("expiresOn") ?? "")
  const file = formData.get("file")

  if (!employeeId) return failure("Employee id is required.")
  if (!name.trim()) return failure("Document name is required.")
  if (!(file instanceof File) || file.size === 0) {
    return failure("Select a file to upload.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, userId } = authorized.context

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${companyId}/${employeeId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from("employee-documents")
    .upload(path, file, { upsert: false })

  if (uploadError) {
    console.error("[action:uploadEmployeeDocument:upload]", uploadError)
    return failure(uploadError.message)
  }

  const { data, error } = await supabase
    .from("employee_documents")
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      name: name.trim(),
      category: category.trim() || null,
      file_path: path,
      expires_on: expiresOn || null,
      uploaded_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:uploadEmployeeDocument:insert]", error)
    await supabase.storage.from("employee-documents").remove([path])
    return failure(error.message)
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true, data }
}

export async function deleteEmployeeDocument(
  id: string,
  employeeId: string,
  filePath: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Document id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("employee_documents")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteEmployeeDocument]", error)
    return failure(error.message)
  }

  if (filePath) {
    await supabase.storage.from("employee-documents").remove([filePath])
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true, data: { id } }
}

export async function getEmployeeDocumentUrl(
  filePath: string
): Promise<ActionResult<{ url: string }>> {
  if (!filePath) return failure("File path is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_VIEW)
  if ("error" in authorized) return authorized.error

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from("employee-documents")
    .createSignedUrl(filePath, 60 * 5)

  if (error || !data?.signedUrl) {
    console.error("[action:getEmployeeDocumentUrl]", error)
    return failure(error?.message ?? "Could not generate download link.")
  }

  return { success: true, data: { url: data.signedUrl } }
}