"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateExpenseCategoryInput = {
  name: string
  code: string
  description?: string
  isActive?: boolean
}

export type UpdateExpenseCategoryInput = CreateExpenseCategoryInput & { id: string }

function normalizeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim()) return failure("Category name is required.")
  if (!input.code.trim()) return failure("Category code is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("expense_categories")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      code: normalizeCode(input.code),
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createExpenseCategory]", error)
    if (error.code === "23505") {
      return failure("A category with this code already exists.")
    }
    return failure(error.message)
  }

  revalidatePath("/expenses/categories")
  revalidatePath("/expenses/items")
  revalidatePath("/expenses/plans")
  revalidatePath("/expenses")

  return { success: true, data }
}

export async function updateExpenseCategory(
  input: UpdateExpenseCategoryInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Category id is required.")
  if (!input.name.trim()) return failure("Category name is required.")
  if (!input.code.trim()) return failure("Category code is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("expense_categories")
    .update({
      name: input.name.trim(),
      code: normalizeCode(input.code),
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateExpenseCategory]", error)
    if (error.code === "23505") {
      return failure("A category with this code already exists.")
    }
    return failure(error.message)
  }

  revalidatePath("/expenses/categories")
  revalidatePath("/expenses/items")
  revalidatePath("/expenses/plans")
  revalidatePath("/expenses")

  return { success: true, data }
}

export async function deleteExpenseCategory(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Category id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteExpenseCategory]", error)
    return failure(error.message)
  }

  revalidatePath("/expenses/categories")
  revalidatePath("/expenses/items")
  revalidatePath("/expenses/plans")
  revalidatePath("/expenses")

  return { success: true, data: { id } }
}
