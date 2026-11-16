"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/

function normalizeCode(value: string) {
  return value.trim().toUpperCase()
}

export type CreateInventoryUomInput = {
  code: string
  name: string
  description?: string
  isActive?: boolean
}

export type UpdateInventoryUomInput = {
  id: string
  name: string
  description?: string
  isActive?: boolean
}

function revalidateUomPaths() {
  revalidatePath("/inventory/uoms")
  revalidatePath("/inventory/uoms/new")
  revalidatePath("/inventory/skus")
}

export async function createInventoryUom(
  input: CreateInventoryUomInput
): Promise<ActionResult<{ id: string }>> {
  const code = normalizeCode(input.code ?? "")
  const name = input.name?.trim() ?? ""

  if (!code) return failure("Unit code is required.")
  if (!CODE_PATTERN.test(code)) {
    return failure("Unit code may only contain letters, numbers, dots, dashes and underscores.")
  }
  if (!name) return failure("Unit name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("inventory_uoms")
    .insert({
      company_id: companyId,
      code,
      name,
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createInventoryUom]", error)
    if (error.code === "23505") {
      return failure(`A unit with the code “${code}” already exists.`)
    }
    return failure(error.message)
  }

  revalidateUomPaths()
  return { success: true, data }
}

export async function updateInventoryUom(
  input: UpdateInventoryUomInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Unit id is required.")

  const name = input.name?.trim() ?? ""
  if (!name) return failure("Unit name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("inventory_uoms")
    .update({
      name,
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateInventoryUom]", error)
    return failure(error.message)
  }

  revalidateUomPaths()
  return { success: true, data }
}

export async function deleteInventoryUom(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Unit id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data: uom, error: readError } = await supabase
    .from("inventory_uoms")
    .select("id, code")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle()

  if (readError) {
    console.error("[action:deleteInventoryUom]", readError)
    return failure(readError.message)
  }
  if (!uom) return failure("Unit not found.")

  const { count, error: usageError } = await supabase
    .from("skus")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("uom", uom.code)

  if (usageError) {
    console.error("[action:deleteInventoryUom]", usageError)
    return failure(usageError.message)
  }

  if ((count ?? 0) > 0) {
    return failure(
      `This unit is used by ${count} SKU${count === 1 ? "" : "s"}. Deactivate it instead of deleting.`
    )
  }

  const { error } = await supabase
    .from("inventory_uoms")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteInventoryUom]", error)
    return failure(error.message)
  }

  revalidateUomPaths()
  return { success: true, data: { id } }
}
