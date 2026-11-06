"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateSkuCategoryInput = {
  name: string
  parentId?: string
}

export type UpdateSkuCategoryInput = CreateSkuCategoryInput & { id: string }

export async function createSkuCategory(
  input: CreateSkuCategoryInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim()) return failure("Category name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("sku_categories")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      parent_id: input.parentId || null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createSkuCategory]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/categories")
  revalidatePath("/inventory/skus")
  return { success: true, data }
}

export async function updateSkuCategory(
  input: UpdateSkuCategoryInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Category id is required.")
  if (!input.name.trim()) return failure("Category name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("sku_categories")
    .update({
      name: input.name.trim(),
      parent_id: input.parentId || null,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateSkuCategory]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/categories")
  revalidatePath("/inventory/skus")
  return { success: true, data }
}

export async function deleteSkuCategory(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Category id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("sku_categories")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteSkuCategory]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/categories")
  revalidatePath("/inventory/skus")
  return { success: true, data: { id } }
}