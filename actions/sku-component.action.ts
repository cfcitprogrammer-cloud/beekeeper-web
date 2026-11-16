"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
  type AuthorizedActionContext,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type AddSkuComponentInput = {
  parentSkuId: string
  componentSkuId: string
  quantity: number
}

export async function addSkuComponent(
  input: AddSkuComponentInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.parentSkuId || !input.componentSkuId) {
    return failure("Parent and component SKUs are required.")
  }
  if (input.parentSkuId === input.componentSkuId) {
    return failure("A SKU cannot be a component of itself.")
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return failure("Quantity must be greater than zero.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("sku_components")
    .insert({
      company_id: companyId,
      parent_sku_id: input.parentSkuId,
      component_sku_id: input.componentSkuId,
      quantity: input.quantity,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:addSkuComponent]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/skus")
  revalidatePath(`/inventory/skus/${input.parentSkuId}`)
  revalidatePath(`/inventory/skus/${input.parentSkuId}/edit`)
  return { success: true, data }
}

export async function updateSkuComponentQuantity(
  id: string,
  quantity: number
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Component id is required.")
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return failure("Quantity must be greater than zero.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("sku_components")
    .update({ quantity })
    .eq("id", id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateSkuComponentQuantity]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/skus")
  return { success: true, data }
}

export async function removeSkuComponent(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Component id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("sku_components")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:removeSkuComponent]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/skus")
  return { success: true, data: { id } }
}