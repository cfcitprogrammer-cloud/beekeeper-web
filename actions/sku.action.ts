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
