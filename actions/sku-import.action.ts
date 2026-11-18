"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  getAuthorizedContextAny,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions"
import { cell, headerMap, parseCsv } from "@/lib/csv"
import type { SkuBomExportRow } from "@/lib/inventory/sku-export"

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type SkuImportError = {
  row: number
  message: string
}

export type SkuCatalogImportResult = {
  created: number
  updated: number
  categoriesCreated: number
  errors: SkuImportError[]
}

export type SkuBomImportResult = {
  created: number
  updated: number
  unchanged: number
  errors: SkuImportError[]
}

type SkuRow = {
  id: string
  sku_code: string
  workspace_id: string | null
  name: string
  barcode: string | null
  description: string | null
  category_id: string | null
  brand: string | null
  uom: string
  uom_id: string | null
  unit_price: number
  tax_rate: number
  production_warehouse_id: string | null
  is_active: boolean
}

type CategoryRow = {
  id: string
  name: string
}

type UomRow = {
  id: string
  code: string
}

type WarehouseRow = {
  id: string
  code: string
  name: string
  workspace_id: string | null
}

type ComponentRow = {
  id: string
  parent_sku_id: string
  component_sku_id: string
  quantity: number
  workspace_id: string | null
}

type BomSkuRow = {
  id: string
  sku_code: string
  workspace_id: string | null
}

type BomRelationRow = {
  quantity: number
  parent:
    | { sku_code: string | null; name: string | null; workspace_id: string | null }
    | null
  component:
    | {
        sku_code: string | null
        name: string | null
        uom: string | null
        workspace_id: string | null
      }
    | null
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const BOM_IMPORT_COLUMNS = [
  "parent_sku_code",
  "component_sku_code",
  "quantity",
] as const

/** A company-wide row (no workspace) is visible everywhere. */
function isWorkspaceVisible(
  activeWorkspaceId: string | null,
  rowWorkspaceId: string | null
) {
  if (!activeWorkspaceId) return true
  return rowWorkspaceId === null || rowWorkspaceId === activeWorkspaceId
}

function isCrossWorkspace(
  activeWorkspaceId: string | null,
  rowWorkspaceId: string | null
) {
  if (!activeWorkspaceId) return false
  return rowWorkspaceId !== null && rowWorkspaceId !== activeWorkspaceId
}

function parseOptionalNumber(
  value: string
): { ok: true; value: number | null } | { ok: false } {
  if (!value) return { ok: true, value: null }
  const parsed = Number(value.replace(/[,\s]/g, ""))
  return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false }
}

function parseOptionalBoolean(
  value: string
): { ok: true; value: boolean | null } | { ok: false } {
  if (!value) return { ok: true, value: null }
  const normalized = value.trim().toLowerCase()
  if (["true", "1", "yes", "y", "active"].includes(normalized)) {
    return { ok: true, value: true }
  }
  if (["false", "0", "no", "n", "inactive"].includes(normalized)) {
    return { ok: true, value: false }
  }
  return { ok: false }
}

function describeMissingHeaders(
  map: Map<string, number>,
  required: readonly string[]
) {
  const missing = required.filter((header) => !map.has(header))
  if (missing.length === 0) return null
  return `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(
    ", "
  )}. Download the import template to get the right headers.`
}

/* -------------------------------------------------------------------------- */
/*                             Catalog mass import                            */
/* -------------------------------------------------------------------------- */

export async function importSkuCatalog(input: {
  csv: string
}): Promise<ActionResult<SkuCatalogImportResult>> {
  if (!input.csv?.trim()) {
    return failure("Choose a CSV file with SKU catalog rows.")
  }

  const authorized = await getAuthorizedContextAny([
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
  ])
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, permissions } = authorized.context
  const canCreate = hasPermission(permissions, PERMISSIONS.INVENTORY_CREATE)
  const canUpdate = hasPermission(permissions, PERMISSIONS.INVENTORY_UPDATE)

  const parsed = parseCsv(input.csv)
  if (parsed.length < 2) {
    return failure(
      "The CSV must contain a header row and at least one SKU row."
    )
  }

  const map = headerMap(parsed[0])
  const missing = describeMissingHeaders(map, ["sku_code"])
  if (missing) return failure(missing)

  const dataRows = parsed.slice(1)

  /* ---- Load existing data once, then process row by row ---- */
  const [skusResult, categoriesResult, uomsResult, warehousesResult] =
    await Promise.all([
      supabase
        .from("skus")
        .select(
          "id, sku_code, workspace_id, name, barcode, description, category_id, brand, uom, uom_id, unit_price, tax_rate, production_warehouse_id, is_active"
        )
        .eq("company_id", companyId),
      workspaceId
        ? supabase
            .from("sku_categories")
            .select("id, name")
            .eq("company_id", companyId)
            .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
        : supabase
            .from("sku_categories")
            .select("id, name")
            .eq("company_id", companyId),
      supabase
        .from("inventory_uoms")
        .select("id, code")
        .eq("company_id", companyId),
      workspaceId
        ? supabase
            .from("inventory_warehouses")
            .select("id, code, name, workspace_id")
            .eq("company_id", companyId)
            .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
        : supabase
            .from("inventory_warehouses")
            .select("id, code, name, workspace_id")
            .eq("company_id", companyId),
    ])

  if (skusResult.error) {
    console.error("[action:importSkuCatalog:skus]", skusResult.error)
    return failure(skusResult.error.message)
  }
  if (categoriesResult.error) {
    console.error("[action:importSkuCatalog:categories]", categoriesResult.error)
    return failure(categoriesResult.error.message)
  }
  if (uomsResult.error) {
    console.error("[action:importSkuCatalog:uoms]", uomsResult.error)
    return failure(uomsResult.error.message)
  }
  if (warehousesResult.error) {
    console.error(
      "[action:importSkuCatalog:warehouses]",
      warehousesResult.error
    )
    return failure(warehousesResult.error.message)
  }

  const skuByCode = new Map<string, SkuRow>()
  for (const sku of (skusResult.data ?? []) as SkuRow[]) {
    skuByCode.set(sku.sku_code.trim().toUpperCase(), sku)
  }

  const categoryByName = new Map<string, string>()
  for (const category of (categoriesResult.data ?? []) as CategoryRow[]) {
    categoryByName.set(category.name.trim().toLowerCase(), category.id)
  }

  const uomByCode = new Map<string, string>()
  for (const uom of (uomsResult.data ?? []) as UomRow[]) {
    uomByCode.set(uom.code.trim().toUpperCase(), uom.id)
  }

  const warehouseByCode = new Map<string, WarehouseRow>()
  const warehouseByName = new Map<string, WarehouseRow>()
  for (const warehouse of (warehousesResult.data ?? []) as WarehouseRow[]) {
    warehouseByCode.set(warehouse.code.trim().toUpperCase(), warehouse)
    warehouseByName.set(warehouse.name.trim().toLowerCase(), warehouse)
  }

  const result: SkuCatalogImportResult = {
    created: 0,
    updated: 0,
    categoriesCreated: 0,
    errors: [],
  }
  const seenCodes = new Set<string>()

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index]
    const rowNumber = index + 2
    const skuCode = cell(row, map, "sku_code").toUpperCase()
    if (!skuCode) {
      result.errors.push({ row: rowNumber, message: "SKU code is required." })
      continue
    }
    if (seenCodes.has(skuCode)) {
      result.errors.push({
        row: rowNumber,
        message: `Duplicate SKU code in this file: ${skuCode}.`,
      })
      continue
    }
    seenCodes.add(skuCode)

    const existing = skuByCode.get(skuCode) ?? null
    if (existing && isCrossWorkspace(workspaceId, existing.workspace_id)) {
      result.errors.push({
        row: rowNumber,
        message: `${skuCode} belongs to another workspace and cannot be imported here.`,
      })
      continue
    }
    if (!existing && !canCreate) {
      result.errors.push({
        row: rowNumber,
        message: `You need the inventory.create permission to add ${skuCode}.`,
      })
      continue
    }
    if (existing && !canUpdate) {
      result.errors.push({
        row: rowNumber,
        message: `You need the inventory.update permission to change ${skuCode}.`,
      })
      continue
    }

    const name = cell(row, map, "name")
    if (!existing && !name) {
      result.errors.push({
        row: rowNumber,
        message: "Product name is required for a new SKU.",
      })
      continue
    }

    const price = parseOptionalNumber(cell(row, map, "unit_price"))
    if (!price.ok) {
      result.errors.push({
        row: rowNumber,
        message: "Unit price must be a number.",
      })
      continue
    }
    const taxRate = parseOptionalNumber(cell(row, map, "tax_rate"))
    if (!taxRate.ok) {
      result.errors.push({ row: rowNumber, message: "Tax rate must be a number." })
      continue
    }
    const isActive = parseOptionalBoolean(cell(row, map, "is_active"))
    if (!isActive.ok) {
      result.errors.push({
        row: rowNumber,
        message: "is_active must be true/false, yes/no or 1/0.",
      })
      continue
    }

    /* ---- Category: resolve by name, create when missing ---- */
    const categoryName = cell(row, map, "category")
    let categoryId: string | null = existing?.category_id ?? null
    if (categoryName) {
      const categoryKey = categoryName.toLowerCase()
      const known = categoryByName.get(categoryKey)
      if (known) {
        categoryId = known
      } else if (canCreate) {
        const { data: createdCategory, error: categoryError } = await supabase
          .from("sku_categories")
          .insert({
            company_id: companyId,
            workspace_id: workspaceId,
            name: categoryName,
          })
          .select("id")
          .single()

        if (categoryError) {
          result.errors.push({
            row: rowNumber,
            message: `Could not create category "${categoryName}": ${categoryError.message}`,
          })
          continue
        }

        categoryId = createdCategory.id
        categoryByName.set(categoryKey, createdCategory.id)
        result.categoriesCreated += 1
      } else {
        result.errors.push({
          row: rowNumber,
          message: `Category "${categoryName}" does not exist and you cannot create it.`,
        })
        continue
      }
    }

    /* ---- Unit of measure ---- */
    const uomValue = cell(row, map, "uom").toUpperCase()
    const uom = uomValue || existing?.uom?.toUpperCase() || "PCS"
    const uomId = uomValue
      ? uomByCode.get(uomValue) ?? null
      : existing?.uom_id ?? uomByCode.get(uom) ?? null

    const warehouseLabel = cell(row, map, "production_warehouse")
    let productionWarehouseId = existing?.production_warehouse_id ?? null
    if (warehouseLabel) {
      const warehouse =
        warehouseByCode.get(warehouseLabel.toUpperCase()) ??
        warehouseByName.get(warehouseLabel.toLowerCase())
      if (!warehouse) {
        result.errors.push({
          row: rowNumber,
          message: `Unknown production warehouse: ${warehouseLabel}. Create it under Inventory → Warehouses first.`,
        })
        continue
      }
      productionWarehouseId = warehouse.id
    }

    const barcode = cell(row, map, "barcode")
    const brand = cell(row, map, "brand")
    const description = cell(row, map, "description")

    if (existing) {
      const { error } = await supabase
        .from("skus")
        .update({
          sku_code: skuCode,
          name: name || existing.name,
          barcode: barcode || existing.barcode,
          description: description || existing.description,
          category_id: categoryId,
          brand: brand || existing.brand,
          uom,
          uom_id: uomId,
          production_warehouse_id: productionWarehouseId,
          unit_price: price.value ?? existing.unit_price,
          tax_rate: taxRate.value ?? existing.tax_rate,
          is_active: isActive.value ?? existing.is_active,
        })
        .eq("id", existing.id)
        .eq("company_id", companyId)

      if (error) {
        console.error("[action:importSkuCatalog:update]", error)
        result.errors.push({ row: rowNumber, message: error.message })
        continue
      }

      result.updated += 1
      skuByCode.set(skuCode, {
        ...existing,
        sku_code: skuCode,
        name: name || existing.name,
        barcode: barcode || existing.barcode,
        description: description || existing.description,
        category_id: categoryId,
        brand: brand || existing.brand,
        uom,
        uom_id: uomId,
        production_warehouse_id: productionWarehouseId,
        unit_price: price.value ?? existing.unit_price,
        tax_rate: taxRate.value ?? existing.tax_rate,
        is_active: isActive.value ?? existing.is_active,
      })
      continue
    }

    const { data: created, error } = await supabase
      .from("skus")
      .insert({
        company_id: companyId,
        workspace_id: workspaceId,
        sku_code: skuCode,
        name,
        barcode: barcode || null,
        description: description || null,
        category_id: categoryId,
        brand: brand || null,
        uom,
        uom_id: uomId,
        production_warehouse_id: productionWarehouseId,
        unit_price: price.value ?? 0,
        tax_rate: taxRate.value ?? 0,
        is_active: isActive.value ?? true,
      })
      .select("id")
      .single()

    if (error) {
      console.error("[action:importSkuCatalog:insert]", error)
      result.errors.push({ row: rowNumber, message: error.message })
      continue
    }

    result.created += 1
    skuByCode.set(skuCode, {
      id: created.id,
      sku_code: skuCode,
      workspace_id: workspaceId,
      name,
      barcode: barcode || null,
      description: description || null,
      category_id: categoryId,
      brand: brand || null,
      uom,
      uom_id: uomId,
      production_warehouse_id: productionWarehouseId,
      unit_price: price.value ?? 0,
      tax_rate: taxRate.value ?? 0,
      is_active: isActive.value ?? true,
    })
  }

  revalidatePath("/inventory/skus")
  revalidatePath("/bookings")

  return { success: true, data: result }
}

/* -------------------------------------------------------------------------- */
/*                               BOM mass import                              */
/* -------------------------------------------------------------------------- */

export async function importSkuBom(input: {
  csv: string
}): Promise<ActionResult<SkuBomImportResult>> {
  if (!input.csv?.trim()) {
    return failure("Choose a CSV file with bill of materials rows.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const parsed = parseCsv(input.csv)
  if (parsed.length < 2) {
    return failure(
      "The CSV must contain a header row and at least one component line."
    )
  }

  const map = headerMap(parsed[0])
  const missing = describeMissingHeaders(map, BOM_IMPORT_COLUMNS)
  if (missing) return failure(missing)

  const dataRows = parsed.slice(1)

  const [skusResult, componentsResult] = await Promise.all([
    supabase
      .from("skus")
      .select("id, sku_code, workspace_id")
      .eq("company_id", companyId),
    supabase
      .from("sku_components")
      .select("id, parent_sku_id, component_sku_id, quantity, workspace_id")
      .eq("company_id", companyId),
  ])

  if (skusResult.error) {
    console.error("[action:importSkuBom:skus]", skusResult.error)
    return failure(skusResult.error.message)
  }
  if (componentsResult.error) {
    console.error("[action:importSkuBom:components]", componentsResult.error)
    return failure(componentsResult.error.message)
  }

  const skuByCode = new Map<string, BomSkuRow>()
  for (const sku of (skusResult.data ?? []) as BomSkuRow[]) {
    skuByCode.set(sku.sku_code.trim().toUpperCase(), sku)
  }

  const componentByPair = new Map<string, ComponentRow>()
  for (const component of (componentsResult.data ?? []) as ComponentRow[]) {
    componentByPair.set(
      `${component.parent_sku_id}:${component.component_sku_id}`,
      component
    )
  }

  const result: SkuBomImportResult = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
  }
  const seenPairs = new Set<string>()

  function resolveCode(
    code: string,
    rowNumber: number
  ): BomSkuRow | undefined {
    if (!code) {
      result.errors.push({ row: rowNumber, message: "SKU code is required." })
      return undefined
    }
    const sku = skuByCode.get(code)
    if (!sku) {
      result.errors.push({
        row: rowNumber,
        message: `Unknown SKU code: ${code}. Import it in the catalog first.`,
      })
      return undefined
    }
    if (isCrossWorkspace(workspaceId, sku.workspace_id)) {
      result.errors.push({
        row: rowNumber,
        message: `${code} belongs to another workspace.`,
      })
      return undefined
    }
    if (!isWorkspaceVisible(workspaceId, sku.workspace_id)) {
      result.errors.push({
        row: rowNumber,
        message: `${code} is not available in the active workspace.`,
      })
      return undefined
    }
    return sku
  }

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index]
    const rowNumber = index + 2
    const parentCode = cell(row, map, "parent_sku_code").toUpperCase()
    const componentCode = cell(row, map, "component_sku_code").toUpperCase()
    const quantityValue = cell(row, map, "quantity")

    const parent = resolveCode(parentCode, rowNumber)
    if (!parent) continue
    const component = resolveCode(componentCode, rowNumber)
    if (!component) continue

    if (parent.id === component.id) {
      result.errors.push({
        row: rowNumber,
        message: "A SKU cannot be a component of itself.",
      })
      continue
    }

    const quantity = parseOptionalNumber(quantityValue)
    if (!quantity.ok || quantity.value === null) {
      result.errors.push({
        row: rowNumber,
        message: "Quantity must be a number.",
      })
      continue
    }
    if (quantity.value <= 0) {
      result.errors.push({
        row: rowNumber,
        message: "Quantity must be greater than zero.",
      })
      continue
    }

    const pairKey = `${parent.id}:${component.id}`
    if (seenPairs.has(pairKey)) {
      result.errors.push({
        row: rowNumber,
        message: `Duplicate component line for ${parentCode} → ${componentCode}.`,
      })
      continue
    }
    seenPairs.add(pairKey)

    const existing = componentByPair.get(pairKey) ?? null
    if (existing) {
      if (isCrossWorkspace(workspaceId, existing.workspace_id)) {
        result.errors.push({
          row: rowNumber,
          message: `This component line belongs to another workspace.`,
        })
        continue
      }
      if (Math.abs(Number(existing.quantity) - quantity.value) < 0.000001) {
        result.unchanged += 1
        continue
      }

      const { error } = await supabase
        .from("sku_components")
        .update({ quantity: quantity.value })
        .eq("id", existing.id)
        .eq("company_id", companyId)

      if (error) {
        console.error("[action:importSkuBom:update]", error)
        result.errors.push({ row: rowNumber, message: error.message })
        continue
      }

      existing.quantity = quantity.value
      result.updated += 1
      continue
    }

    const { data: created, error } = await supabase
      .from("sku_components")
      .insert({
        company_id: companyId,
        workspace_id: workspaceId,
        parent_sku_id: parent.id,
        component_sku_id: component.id,
        quantity: quantity.value,
      })
      .select("id")
      .single()

    if (error) {
      console.error("[action:importSkuBom:insert]", error)
      result.errors.push({ row: rowNumber, message: error.message })
      continue
    }

    componentByPair.set(pairKey, {
      id: created.id,
      parent_sku_id: parent.id,
      component_sku_id: component.id,
      quantity: quantity.value,
      workspace_id: workspaceId,
    })
    result.created += 1
  }

  revalidatePath("/inventory/skus")

  return { success: true, data: result }
}

/* -------------------------------------------------------------------------- */
/*                               BOM export rows                              */
/* -------------------------------------------------------------------------- */

export async function getSkuBomExportRows(): Promise<
  ActionResult<SkuBomExportRow[]>
> {
  const authorized = await getAuthorizedContext(PERMISSIONS.INVENTORY_VIEW)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("sku_components")
    .select(
      "quantity, parent:skus!sku_components_parent_sku_id_fkey(sku_code,name,workspace_id), component:skus!sku_components_component_sku_id_fkey(sku_code,name,uom,workspace_id)"
    )
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:getSkuBomExportRows]", error)
    return failure(error.message)
  }

  const rows = ((data ?? []) as unknown as BomRelationRow[])
    .filter((row) => row.parent && row.component)
    .filter(
      (row) =>
        isWorkspaceVisible(workspaceId, row.parent?.workspace_id ?? null) &&
        isWorkspaceVisible(workspaceId, row.component?.workspace_id ?? null)
    )
    .map((row) => ({
      parentSkuCode: row.parent?.sku_code ?? "",
      parentName: row.parent?.name ?? "",
      componentSkuCode: row.component?.sku_code ?? "",
      componentName: row.component?.name ?? "",
      quantity: Number(row.quantity),
      componentUom: row.component?.uom ?? "",
    }))
    .sort(
      (left, right) =>
        left.parentSkuCode.localeCompare(right.parentSkuCode) ||
        left.componentSkuCode.localeCompare(right.componentSkuCode)
    )

  return { success: true, data: rows }
}
