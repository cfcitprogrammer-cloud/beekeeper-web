"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
  type AuthorizedActionContext,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateSkuInput = {
  name: string
  skuCode: string
  categoryId?: string
  barcode?: string
  brand?: string
  /** Unit code. Prefer `uomId` so the master record is the source of truth. */
  uom?: string
  uomId?: string
  /** Optional label pointing at the item's production warehouse. */
  productionWarehouseId?: string
  unitPrice: number
  taxRate: number
  isActive: boolean
}

export type UpdateSkuInput = CreateSkuInput & { id: string }

/**
 * Resolve the SKU unit of measure against the company's UOM master data.
 * Returns the code that is snapshotted on the SKU plus the master record id.
 */
async function resolveUom(
  supabase: AuthorizedActionContext["supabase"],
  companyId: string,
  workspaceId: string | null,
  input: Pick<CreateSkuInput, "uom" | "uomId">
): Promise<
  { ok: true; uom: string; uomId: string | null } | { ok: false; error: string }
> {
  if (input.uomId) {
    let uomQuery = supabase
      .from("inventory_uoms")
      .select("id, code")
      .eq("id", input.uomId)
      .eq("company_id", companyId)
    if (workspaceId) {
      uomQuery = uomQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    }
    const { data, error } = await uomQuery.maybeSingle()

    if (error) {
      console.error("[action:resolveUom]", error)
      return { ok: false, error: error.message }
    }
    if (!data) {
      return { ok: false, error: "Select a valid unit of measure." }
    }

    return { ok: true, uom: data.code, uomId: data.id }
  }

  const code = input.uom?.trim().toUpperCase() ?? ""
  if (!code) return { ok: false, error: "Unit of measure is required." }

  let uomCodeQuery = supabase
    .from("inventory_uoms")
    .select("id")
    .eq("company_id", companyId)
    .eq("code", code)
  if (workspaceId) {
    uomCodeQuery = uomCodeQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data } = await uomCodeQuery.maybeSingle()

  return { ok: true, uom: code, uomId: data?.id ?? null }
}

/**
 * Validate the optional production warehouse label. The warehouse must belong
 * to the company and be visible in the active workspace.
 */
async function resolveProductionWarehouse(
  supabase: AuthorizedActionContext["supabase"],
  companyId: string,
  workspaceId: string | null,
  warehouseId: string | undefined
): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  if (!warehouseId) return { ok: true, id: null }

  const { data, error } = await supabase
    .from("inventory_warehouses")
    .select("id, workspace_id")
    .eq("id", warehouseId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (error) {
    console.error("[action:resolveProductionWarehouse]", error)
    return { ok: false, error: error.message }
  }
  if (!data) {
    return { ok: false, error: "Select a valid production warehouse." }
  }
  if (
    data.workspace_id !== null &&
    workspaceId !== null &&
    data.workspace_id !== workspaceId
  ) {
    return {
      ok: false,
      error: "That warehouse belongs to another workspace.",
    }
  }

  return { ok: true, id: data.id }
}

export async function updateSku(
  input: UpdateSkuInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("SKU id is required.")
  if (!input.name.trim() || !input.skuCode.trim()) {
    return failure("Product name and SKU code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const uomResult = await resolveUom(supabase, companyId, workspaceId, input)
  if (!uomResult.ok) return failure(uomResult.error)

  const warehouseResult = await resolveProductionWarehouse(
    supabase,
    companyId,
    workspaceId,
    input.productionWarehouseId
  )
  if (!warehouseResult.ok) return failure(warehouseResult.error)

  let skuUpdateQuery = supabase
    .from("skus")
    .update({
      sku_code: input.skuCode.trim().toUpperCase(),
      barcode: input.barcode?.trim() || null,
      name: input.name.trim(),
      category_id: input.categoryId || null,
      brand: input.brand?.trim() || null,
      uom: uomResult.uom,
      uom_id: uomResult.uomId,
      production_warehouse_id: warehouseResult.id,
      unit_price: input.unitPrice,
      tax_rate: input.taxRate,
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
  if (workspaceId) {
    skuUpdateQuery = skuUpdateQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data, error } = await skuUpdateQuery.select("id").single()

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

  const { supabase, companyId, workspaceId } = authorized.context

  let skuDeleteQuery = supabase
    .from("skus")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
  if (workspaceId) {
    skuDeleteQuery = skuDeleteQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { error } = await skuDeleteQuery

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

  const { supabase, companyId, workspaceId } = authorized.context

  const uomResult = await resolveUom(supabase, companyId, workspaceId, input)
  if (!uomResult.ok) return failure(uomResult.error)

  const warehouseResult = await resolveProductionWarehouse(
    supabase,
    companyId,
    workspaceId,
    input.productionWarehouseId
  )
  if (!warehouseResult.ok) return failure(warehouseResult.error)

  const { data, error } = await supabase
    .from("skus")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      sku_code: input.skuCode.trim().toUpperCase(),
      barcode: input.barcode?.trim() || null,
      name: input.name.trim(),
      category_id: input.categoryId || null,
      brand: input.brand?.trim() || null,
      uom: uomResult.uom,
      uom_id: uomResult.uomId,
      production_warehouse_id: warehouseResult.id,
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
