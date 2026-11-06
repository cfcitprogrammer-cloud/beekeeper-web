"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateSkuInput = {
  name: string
  skuCode: string
  categoryId?: string
  barcode?: string
  brand?: string
  uom: string
  unitPrice: number
  taxRate: number
  isActive: boolean
}

export type UpdateSkuInput = CreateSkuInput & { id: string }

export async function updateSku(
  input: UpdateSkuInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("SKU id is required.")
  if (!input.name.trim() || !input.skuCode.trim()) {
    return failure("Product name and SKU code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("skus")
    .update({
      sku_code: input.skuCode.trim().toUpperCase(),
      barcode: input.barcode?.trim() || null,
      name: input.name.trim(),
      category_id: input.categoryId || null,
      brand: input.brand?.trim() || null,
      uom: input.uom,
      unit_price: input.unitPrice,
      tax_rate: input.taxRate,
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateSku]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/skus")
  revalidatePath("/bookings")
  return { success: true, data }
}

export async function deleteSku(id: string): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("SKU id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("skus")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteSku]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/skus")
  revalidatePath("/bookings")
  return { success: true, data: { id } }
}

export async function createSku(
  input: CreateSkuInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim() || !input.skuCode.trim()) {
    return failure("Product name and SKU code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("skus")
    .insert({
      company_id: companyId,
      sku_code: input.skuCode.trim().toUpperCase(),
      barcode: input.barcode?.trim() || null,
      name: input.name.trim(),
      category_id: input.categoryId || null,
      brand: input.brand?.trim() || null,
      uom: input.uom,
      unit_price: input.unitPrice,
      tax_rate: input.taxRate,
      is_active: input.isActive,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createSku]", error)
    return failure(error.message)
  }

  revalidatePath("/inventory/skus")
  revalidatePath("/bookings")

  return { success: true, data }
}
