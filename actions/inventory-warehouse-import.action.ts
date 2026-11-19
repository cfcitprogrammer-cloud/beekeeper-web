"use server"

import { revalidatePath } from "next/cache"

import { parseCsv, headerMap, cell } from "@/lib/csv"
import {
  failure,
  getAuthorizedContextAny,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type WarehouseImportResult = {
  created: number
  updated: number
  errors: { row: number; message: string }[]
}

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/

function normalizeCode(value: string) {
  return value.trim().toUpperCase()
}

function parseOptionalBoolean(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (["true", "yes", "y", "1", "active"].includes(normalized)) return true
  if (["false", "no", "n", "0", "inactive"].includes(normalized)) return false
  return null
}

export async function importInventoryWarehouses(input: {
  csv: string
}): Promise<ActionResult<WarehouseImportResult>> {
  if (!input.csv?.trim()) {
    return failure("Choose a CSV file with warehouse rows.")
  }

  const authorized = await getAuthorizedContextAny([
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
  ])
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, permissions } = authorized.context
  const canCreate = permissions.includes(PERMISSIONS.INVENTORY_CREATE)
  const canUpdate = permissions.includes(PERMISSIONS.INVENTORY_UPDATE)

  const parsed = parseCsv(input.csv)
  if (parsed.length < 2) {
    return failure("The CSV must contain a header row and at least one warehouse row.")
  }

  const map = headerMap(parsed[0])
  if (!map.has("code")) {
    return failure(
      "Missing required column: code. Download the import template to get the right headers."
    )
  }
  if (!map.has("name")) {
    return failure(
      "Missing required column: name. Download the import template to get the right headers."
    )
  }

  const dataRows = parsed.slice(1)

  const { data: existingData, error: existingError } = await supabase
    .from("inventory_warehouses")
    .select("id, code, workspace_id, name, address, contact_person, phone, email, notes, is_active")
    .eq("company_id", companyId)

  if (existingError) {
    console.error("[action:importInventoryWarehouses:load]", existingError)
    return failure(existingError.message)
  }

  /** A company-wide row (no workspace) is visible everywhere. */
  function isWorkspaceVisible(rowWorkspaceId: string | null) {
    if (!workspaceId) return true
    return rowWorkspaceId === null || rowWorkspaceId === workspaceId
  }
  function isCrossWorkspace(rowWorkspaceId: string | null) {
    if (!workspaceId) return false
    return rowWorkspaceId !== null && rowWorkspaceId !== workspaceId
  }

  const byCode = new Map<string, (typeof existingData)[number]>()
  for (const warehouse of existingData ?? []) {
    if (!isWorkspaceVisible(warehouse.workspace_id)) continue
    const key = warehouse.code.trim().toUpperCase()
    const existing = byCode.get(key)
    if (!existing || warehouse.workspace_id === workspaceId) {
      byCode.set(key, warehouse)
    }
  }

  const result: WarehouseImportResult = { created: 0, updated: 0, errors: [] }

  for (let index = 0; index < dataRows.length; index += 1) {
    const rowNumber = index + 2
    const row = dataRows[index]
    const code = normalizeCode(cell(row, map, "code"))
    const name = cell(row, map, "name")

    if (!code) {
      result.errors.push({ row: rowNumber, message: "Warehouse code is required." })
      continue
    }
    if (!CODE_PATTERN.test(code)) {
      result.errors.push({
        row: rowNumber,
        message: "Warehouse code may only contain letters, numbers, dots, dashes and underscores.",
      })
      continue
    }

    const existing = byCode.get(code)
    if (existing && isCrossWorkspace(existing.workspace_id)) {
      result.errors.push({
        row: rowNumber,
        message: `A warehouse with the code “${code}” belongs to another workspace and cannot be imported here.`,
      })
      continue
    }
    const address = cell(row, map, "address")
    const contactPerson = cell(row, map, "contact_person")
    const phone = cell(row, map, "phone")
    const email = cell(row, map, "email")
    const notes = cell(row, map, "notes")
    const isActiveRaw = cell(row, map, "is_active")
    const isActiveParsed = parseOptionalBoolean(isActiveRaw)

    if (existing) {
      if (!canUpdate) {
        result.errors.push({
          row: rowNumber,
          message: "You do not have permission to update warehouses.",
        })
        continue
      }

      const updatePayload: Record<string, unknown> = {}
      if (name) updatePayload.name = name
      if (address) updatePayload.address = address
      if (contactPerson) updatePayload.contact_person = contactPerson
      if (phone) updatePayload.phone = phone
      if (email) updatePayload.email = email
      if (notes) updatePayload.notes = notes
      if (isActiveParsed !== null) updatePayload.is_active = isActiveParsed

      const { error } = await supabase
        .from("inventory_warehouses")
        .update(updatePayload)
        .eq("id", existing.id)
        .eq("company_id", companyId)

      if (error) {
        console.error("[action:importInventoryWarehouses:update]", error)
        result.errors.push({ row: rowNumber, message: error.message })
        continue
      }

      result.updated += 1
      continue
    }

    if (!canCreate) {
      result.errors.push({
        row: rowNumber,
        message: "You do not have permission to create warehouses.",
      })
      continue
    }
    if (!name) {
      result.errors.push({
        row: rowNumber,
        message: "Warehouse name is required for new warehouses.",
      })
      continue
    }

    const { error } = await supabase
      .from("inventory_warehouses")
      .insert({
        company_id: companyId,
        workspace_id: workspaceId,
        code,
        name,
        address: address || null,
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        is_active: isActiveParsed ?? true,
      })

    if (error) {
      console.error("[action:importInventoryWarehouses:insert]", error)
      if (error.code === "23505") {
        result.errors.push({
          row: rowNumber,
          message: `A warehouse with the code “${code}” already exists.`,
        })
      } else {
        result.errors.push({ row: rowNumber, message: error.message })
      }
      continue
    }

    result.created += 1
  }

  revalidatePath("/inventory/warehouses")
  revalidatePath("/inventory/stock")
  return { success: true, data: result }
}
