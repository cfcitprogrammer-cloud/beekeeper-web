"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
  type AuthorizedActionContext,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type StockMovementInput = {
  warehouseId: string
  skuId: string
  quantity: number
  reference?: string
  notes?: string
}

export type AdjustStockInput = StockMovementInput & {
  direction: "increase" | "decrease"
}

export type TransferStockInput = {
  fromWarehouseId: string
  toWarehouseId: string
  skuId: string
  quantity: number
  notes?: string
}

export type StockMovementResult = {
  quantity: number
  movementType: string
}

function revalidateStockPaths(warehouseIds: string[], skuId?: string) {
  revalidatePath("/inventory/stock")
  revalidatePath("/inventory/warehouses")
  for (const id of warehouseIds) {
    revalidatePath(`/inventory/warehouses/${id}`)
  }
  if (skuId) revalidatePath(`/inventory/skus/${skuId}`)
}

async function resolveWarehouse(
  supabase: AuthorizedActionContext["supabase"],
  companyId: string,
  workspaceId: string | null,
  warehouseId: string
): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("inventory_warehouses")
    .select("id, workspace_id, is_active")
    .eq("id", warehouseId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (error) {
    console.error("[action:resolveWarehouse]", error)
    return { ok: false, error: error.message }
  }
  if (!data) return { ok: false, error: "Select a valid warehouse." }
  if (!data.is_active) {
    return {
      ok: false,
      error: "That warehouse is inactive. Reactivate it before moving stock.",
    }
  }
  if (
    data.workspace_id !== null &&
    workspaceId !== null &&
    data.workspace_id !== workspaceId
  ) {
    return { ok: false, error: "That warehouse belongs to another workspace." }
  }

  return { ok: true, id: data.id }
}

async function resolveSku(
  supabase: AuthorizedActionContext["supabase"],
  companyId: string,
  workspaceId: string | null,
  skuId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("skus")
    .select("id, workspace_id")
    .eq("id", skuId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (error) {
    console.error("[action:resolveSku]", error)
    return { ok: false, error: error.message }
  }
  if (!data) return { ok: false, error: "Select a valid SKU." }
  if (
    data.workspace_id !== null &&
    workspaceId !== null &&
    data.workspace_id !== workspaceId
  ) {
    return { ok: false, error: "That SKU belongs to another workspace." }
  }

  return { ok: true, id: data.id }
}

function movementFailure(
  scope: string,
  error: { message?: string; code?: string }
): ActionResult<never> {
  console.error(`[action:${scope}]`, error)
  const message = error.message ?? ""
  if (/insufficient stock/i.test(message)) return failure(message)
  if (/quantity must/i.test(message)) return failure(message)
  if (/different destination/i.test(message)) return failure(message)
  return failure(message || "Could not apply the stock movement.")
}

function parseQuantity(value: number, allowNegative: boolean) {
  if (!Number.isFinite(value)) return null
  if (allowNegative) {
    if (value === 0) return null
    return value
  }
  if (value <= 0) return null
  return value
}

async function applyMovement(
  supabase: AuthorizedActionContext["supabase"],
  userId: string,
  input: {
    companyId: string
    workspaceId: string | null
    warehouseId: string
    skuId: string
    movementType: "receipt" | "issue" | "adjustment"
    quantity: number
    reference?: string
    notes?: string
  }
): Promise<StockMovementResult | { error: ActionResult<never> }> {
  const { error } = await supabase.rpc("apply_warehouse_stock_movement", {
    p_company_id: input.companyId,
    p_workspace_id: input.workspaceId,
    p_warehouse_id: input.warehouseId,
    p_sku_id: input.skuId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_reference: input.reference?.trim() || null,
    p_notes: input.notes?.trim() || null,
    p_transfer_group_id: null,
    p_created_by: userId,
  })

  if (error) {
    return { error: movementFailure(`apply_${input.movementType}`, error) }
  }

  return { quantity: input.quantity, movementType: input.movementType }
}

export async function receiveWarehouseStock(
  input: StockMovementInput
): Promise<ActionResult<StockMovementResult>> {
  const quantity = parseQuantity(input.quantity, false)
  if (quantity === null) {
    return failure("Quantity must be greater than zero.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error
  const { supabase, companyId, workspaceId, userId } = authorized.context

  const warehouse = await resolveWarehouse(
    supabase,
    companyId,
    workspaceId,
    input.warehouseId
  )
  if (!warehouse.ok) return failure(warehouse.error)

  const sku = await resolveSku(supabase, companyId, workspaceId, input.skuId)
  if (!sku.ok) return failure(sku.error)

  const result = await applyMovement(supabase, userId, {
    companyId,
    workspaceId,
    warehouseId: warehouse.id,
    skuId: sku.id,
    movementType: "receipt",
    quantity,
    reference: input.reference,
    notes: input.notes,
  })
  if ("error" in result) return result.error

  revalidateStockPaths([warehouse.id], sku.id)
  return { success: true, data: result }
}

export async function issueWarehouseStock(
  input: StockMovementInput
): Promise<ActionResult<StockMovementResult>> {
  const quantity = parseQuantity(input.quantity, false)
  if (quantity === null) {
    return failure("Quantity must be greater than zero.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error
  const { supabase, companyId, workspaceId, userId } = authorized.context

  const warehouse = await resolveWarehouse(
    supabase,
    companyId,
    workspaceId,
    input.warehouseId
  )
  if (!warehouse.ok) return failure(warehouse.error)

  const sku = await resolveSku(supabase, companyId, workspaceId, input.skuId)
  if (!sku.ok) return failure(sku.error)

  const result = await applyMovement(supabase, userId, {
    companyId,
    workspaceId,
    warehouseId: warehouse.id,
    skuId: sku.id,
    movementType: "issue",
    quantity: -quantity,
    reference: input.reference,
    notes: input.notes,
  })
  if ("error" in result) return result.error

  revalidateStockPaths([warehouse.id], sku.id)
  return { success: true, data: result }
}

export async function adjustWarehouseStock(
  input: AdjustStockInput
): Promise<ActionResult<StockMovementResult>> {
  const quantity = parseQuantity(input.quantity, false)
  if (quantity === null) {
    return failure("Quantity must be greater than zero.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error
  const { supabase, companyId, workspaceId, userId } = authorized.context

  const warehouse = await resolveWarehouse(
    supabase,
    companyId,
    workspaceId,
    input.warehouseId
  )
  if (!warehouse.ok) return failure(warehouse.error)

  const sku = await resolveSku(supabase, companyId, workspaceId, input.skuId)
  if (!sku.ok) return failure(sku.error)

  const signedQuantity = input.direction === "decrease" ? -quantity : quantity

  const result = await applyMovement(supabase, userId, {
    companyId,
    workspaceId,
    warehouseId: warehouse.id,
    skuId: sku.id,
    movementType: "adjustment",
    quantity: signedQuantity,
    reference: input.reference,
    notes: input.notes,
  })
  if ("error" in result) return result.error

  revalidateStockPaths([warehouse.id], sku.id)
  return { success: true, data: result }
}

export async function transferWarehouseStock(
  input: TransferStockInput
): Promise<ActionResult<StockMovementResult>> {
  if (input.fromWarehouseId === input.toWarehouseId) {
    return failure("Choose a different destination warehouse.")
  }

  const quantity = parseQuantity(input.quantity, false)
  if (quantity === null) {
    return failure("Quantity must be greater than zero.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error
  const { supabase, companyId, workspaceId, userId } = authorized.context

  const from = await resolveWarehouse(
    supabase,
    companyId,
    workspaceId,
    input.fromWarehouseId
  )
  if (!from.ok) return failure(from.error)

  const to = await resolveWarehouse(
    supabase,
    companyId,
    workspaceId,
    input.toWarehouseId
  )
  if (!to.ok) return failure(to.error)

  const sku = await resolveSku(supabase, companyId, workspaceId, input.skuId)
  if (!sku.ok) return failure(sku.error)

  const { error } = await supabase.rpc("transfer_warehouse_stock", {
    p_company_id: companyId,
    p_workspace_id: workspaceId,
    p_from_warehouse_id: from.id,
    p_to_warehouse_id: to.id,
    p_sku_id: sku.id,
    p_quantity: quantity,
    p_notes: input.notes?.trim() || null,
    p_created_by: userId,
  })

  if (error) {
    return movementFailure("transferWarehouseStock", error)
  }

  revalidateStockPaths([from.id, to.id], sku.id)
  return { success: true, data: { quantity, movementType: "transfer" } }
}
