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

export type CreateInventoryWarehouseInput = {
  code: string
  name: string
  address?: string
  contactPerson?: string
  phone?: string
  email?: string
  notes?: string
  isActive?: boolean
}

export type UpdateInventoryWarehouseInput = Omit<
  CreateInventoryWarehouseInput,
  "code"
> & { id: string }

function revalidateWarehousePaths() {
  revalidatePath("/inventory/warehouses")
  revalidatePath("/inventory/warehouses/new")
  revalidatePath("/inventory/stock")
  revalidatePath("/inventory/skus")
  revalidatePath("/inventory/skus/new")
}

function cleanFields(input: {
  name: string
  address?: string
  contactPerson?: string
  phone?: string
  email?: string
  notes?: string
}) {
  return {
    name: input.name.trim(),
    address: input.address?.trim() || null,
    contact_person: input.contactPerson?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
  }
}

export async function createInventoryWarehouse(
  input: CreateInventoryWarehouseInput
): Promise<ActionResult<{ id: string }>> {
  const code = normalizeCode(input.code ?? "")
  const name = input.name?.trim() ?? ""

  if (!code) return failure("Warehouse code is required.")
  if (!CODE_PATTERN.test(code)) {
    return failure(
      "Warehouse code may only contain letters, numbers, dots, dashes and underscores."
    )
  }
  if (!name) return failure("Warehouse name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("inventory_warehouses")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      code,
      ...cleanFields({ ...input, name }),
      is_active: input.isActive ?? true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createInventoryWarehouse]", error)
    if (error.code === "23505") {
      return failure(`A warehouse with the code “${code}” already exists.`)
    }
    return failure(error.message)
  }

  revalidateWarehousePaths()
  return { success: true, data }
}

export async function updateInventoryWarehouse(
  input: UpdateInventoryWarehouseInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Warehouse id is required.")

  const name = input.name?.trim() ?? ""
  if (!name) return failure("Warehouse name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  let warehouseQuery = supabase
    .from("inventory_warehouses")
    .update({
      ...cleanFields({ ...input, name }),
      is_active: input.isActive ?? true,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
  if (workspaceId) {
    warehouseQuery = warehouseQuery.or(
      `workspace_id.is.null,workspace_id.eq.${workspaceId}`
    )
  }
  const { data, error } = await warehouseQuery.select("id").single()

  if (error) {
    console.error("[action:updateInventoryWarehouse]", error)
    return failure(error.message)
  }

  revalidateWarehousePaths()
  return { success: true, data }
}

export async function deleteInventoryWarehouse(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Warehouse id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  let warehouseReadQuery = supabase
    .from("inventory_warehouses")
    .select("id, code")
    .eq("id", id)
    .eq("company_id", companyId)
  if (workspaceId) {
    warehouseReadQuery = warehouseReadQuery.or(
      `workspace_id.is.null,workspace_id.eq.${workspaceId}`
    )
  }
  const { data: warehouse, error: readError } = await warehouseReadQuery.maybeSingle()

  if (readError) {
    console.error("[action:deleteInventoryWarehouse]", readError)
    return failure(readError.message)
  }
  if (!warehouse) return failure("Warehouse not found.")

  let skuCountQuery = supabase
    .from("skus")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("production_warehouse_id", id)
  if (workspaceId) {
    skuCountQuery = skuCountQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { count, error: usageError } = await skuCountQuery

  if (usageError) {
    console.error("[action:deleteInventoryWarehouse]", usageError)
    return failure(usageError.message)
  }

  if ((count ?? 0) > 0) {
    return failure(
      `This warehouse is assigned to ${count} SKU${count === 1 ? "" : "s"}. Deactivate it instead of deleting.`
    )
  }

  let stockCountQuery = supabase
    .from("warehouse_stock")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("warehouse_id", id)
    .gt("quantity", 0)
  if (workspaceId) {
    stockCountQuery = stockCountQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { count: stockCount, error: stockError } = await stockCountQuery

  if (stockError) {
    console.error("[action:deleteInventoryWarehouse]", stockError)
    return failure(stockError.message)
  }

  if ((stockCount ?? 0) > 0) {
    return failure(
      "This warehouse still holds stock. Move or issue the remaining stock, then deactivate the warehouse instead of deleting it."
    )
  }

  let movementCountQuery = supabase
    .from("warehouse_stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("warehouse_id", id)
  if (workspaceId) {
    movementCountQuery = movementCountQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { count: movementCount, error: movementError } = await movementCountQuery

  if (movementError) {
    console.error("[action:deleteInventoryWarehouse]", movementError)
    return failure(movementError.message)
  }

  if ((movementCount ?? 0) > 0) {
    return failure(
      "This warehouse has stock movement history. Deactivate it instead of deleting so the audit trail stays intact."
    )
  }

  let deleteQuery = supabase
    .from("inventory_warehouses")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
  if (workspaceId) {
    deleteQuery = deleteQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { error } = await deleteQuery

  if (error) {
    console.error("[action:deleteInventoryWarehouse]", error)
    return failure(error.message)
  }

  revalidateWarehousePaths()
  return { success: true, data: { id } }
}
