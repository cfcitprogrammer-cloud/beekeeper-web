"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { logActivity } from "@/actions/helpers/activity"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { createAdminClient } from "@/utils/supabase/admin"

export type CsvExport = { filename: string; csv: string; rowCount: number }
export type CsvImportError = { row: number; message: string }
export type CsvImportResult = {
  imported: number
  skipped: number
  errors: CsvImportError[]
}

const EMPLOYEE_HEADERS = [
  "employee_no",
  "first_name",
  "middle_name",
  "last_name",
  "email",
  "phone",
  "sss_no",
  "philhealth_no",
  "tin_no",
  "pagibig_no",
  "employment_type",
  "status",
  "hire_date",
  "department_id",
  "position_id",
] as const

const OUTLET_HEADERS = [
  "code",
  "name",
  "description",
  "address",
  "region",
  "province",
  "city",
  "barangay",
  "zip_code",
  "is_distributor",
  "distributor_code",
  "contact_person",
  "phone",
  "email",
  "latitude",
  "longitude",
  "geofence_radius_m",
  "is_active",
  "status",
] as const

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function toCsv(headers: readonly string[], rows: (string | number | null | undefined)[][]) {
  return [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join(
    "\r\n"
  )
}

/** RFC 4180-compatible parser with quoted fields, escaped quotes and newlines. */
function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "")
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""))
      field = ""
      if (row.some((value) => value.trim() !== "")) rows.push(row)
      row = []
    } else {
      field += char
    }
  }

  row.push(field.replace(/\r$/, ""))
  if (row.some((value) => value.trim() !== "")) rows.push(row)

  return rows
}

function headerMap(headerRow: string[]) {
  const map = new Map<string, number>()
  headerRow.forEach((value, index) => {
    map.set(value.trim().toLowerCase().replace(/\s+/g, "_"), index)
  })
  return map
}

function cell(row: string[], map: Map<string, number>, key: string) {
  const index = map.get(key)
  if (index === undefined) return ""
  return (row[index] ?? "").trim()
}

function dbEmploymentType(value: string) {
  switch (value.toUpperCase()) {
    case "PART_TIME":
      return "part_time"
    case "CONTRACTOR":
    case "CONTRACTUAL":
      return "contractual"
    case "INTERN":
      return "intern"
    case "CONSULTANT":
      return "consultant"
    default:
      return "full_time"
  }
}

function dbEmploymentStatus(value: string) {
  const normalized = value.toLowerCase()
  return ["active", "probation", "on_leave", "suspended", "resigned", "terminated"].includes(
    normalized
  )
    ? normalized
    : "active"
}

function dbOutletStatus(value: string) {
  const normalized = value.toLowerCase()
  return ["draft", "pending_approval", "approved", "rejected", "cancelled"].includes(
    normalized
  )
    ? normalized
    : "pending_approval"
}

export async function exportEmployees(): Promise<ActionResult<CsvExport>> {
  const authorized = await getAuthorizedContext(PERMISSIONS.IMPORTS_EXECUTE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_HEADERS.join(", "))
    .eq("company_id", companyId)
    .order("last_name")

  if (error) {
    console.error("[action:exportEmployees]", error)
    return failure(error.message)
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const csv = toCsv(
    EMPLOYEE_HEADERS,
    rows.map((row) => EMPLOYEE_HEADERS.map((header) => row[header] as string | null))
  )

  return {
    success: true,
    data: { filename: `employees-${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length },
  }
}

export async function exportOutlets(): Promise<ActionResult<CsvExport>> {
  const authorized = await getAuthorizedContext(PERMISSIONS.IMPORTS_EXECUTE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context
  const { data, error } = await supabase
    .from("outlets")
    .select(OUTLET_HEADERS.join(", "))
    .eq("company_id", companyId)
    .order("name")

  if (error) {
    console.error("[action:exportOutlets]", error)
    return failure(error.message)
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  const csv = toCsv(
    OUTLET_HEADERS,
    rows.map((row) => OUTLET_HEADERS.map((header) => row[header] as string | null))
  )

  return {
    success: true,
    data: { filename: `outlets-${new Date().toISOString().slice(0, 10)}.csv`, csv, rowCount: rows.length },
  }
}

export type ImportEmployeesInput = {
  csv: string
  createAccounts?: boolean
}

export async function importEmployees(
  input: ImportEmployeesInput
): Promise<ActionResult<CsvImportResult>> {
  if (!input.csv?.trim()) return failure("Choose a CSV file with employee rows.")

  const authorized = await getAuthorizedContext(PERMISSIONS.IMPORTS_EXECUTE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const parsed = parseCsv(input.csv)
  if (parsed.length < 2) return failure("The CSV must contain a header row and at least one employee.")

  const map = headerMap(parsed[0])
  if (!map.has("first_name") || !map.has("last_name")) {
    return failure("The CSV must include first_name and last_name columns.")
  }

  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)

  let nextNumber = (count ?? 0) + 1
  const errors: CsvImportError[] = []
  let imported = 0
  let skipped = 0
  const admin = input.createAccounts ? createAdminClient() : null

  for (let index = 1; index < parsed.length; index += 1) {
    const row = parsed[index]
    const rowNumber = index + 1
    const firstName = cell(row, map, "first_name")
    const lastName = cell(row, map, "last_name")
    const email = cell(row, map, "email").toLowerCase()

    if (!firstName || !lastName) {
      errors.push({ row: rowNumber, message: "first_name and last_name are required." })
      skipped += 1
      continue
    }

    if (input.createAccounts && !email) {
      errors.push({ row: rowNumber, message: "email is required when creating login accounts." })
      skipped += 1
      continue
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNumber, message: `Invalid email "${email}".` })
      skipped += 1
      continue
    }

    const password = cell(row, map, "password")
    if (input.createAccounts && password.length < 8) {
      errors.push({
        row: rowNumber,
        message: "A password column with at least 8 characters is required for login accounts.",
      })
      skipped += 1
      continue
    }

    let authUserId: string | null = null
    if (input.createAccounts && admin) {
      const { data: created, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `${firstName} ${lastName}`.trim() },
      })
      if (authError || !created.user) {
        errors.push({
          row: rowNumber,
          message: authError?.message ?? "Could not create the login account.",
        })
        skipped += 1
        continue
      }
      authUserId = created.user.id
    }

    const employeeNo =
      cell(row, map, "employee_no") || `EMP-${String(nextNumber).padStart(4, "0")}`

    const { error } = await supabase.from("employees").insert({
      company_id: companyId,
      workspace_id: workspaceId,
      user_id: authUserId,
      employee_no: employeeNo,
      first_name: firstName,
      middle_name: cell(row, map, "middle_name") || null,
      last_name: lastName,
      email: email || null,
      phone: cell(row, map, "phone") || null,
      sss_no: cell(row, map, "sss_no").toUpperCase() || null,
      philhealth_no: cell(row, map, "philhealth_no").toUpperCase() || null,
      tin_no: cell(row, map, "tin_no").toUpperCase() || null,
      pagibig_no: cell(row, map, "pagibig_no").toUpperCase() || null,
      employment_type: dbEmploymentType(cell(row, map, "employment_type")),
      status: dbEmploymentStatus(cell(row, map, "status")),
      hire_date: cell(row, map, "hire_date") || null,
      department_id: cell(row, map, "department_id") || null,
      position_id: cell(row, map, "position_id") || null,
    })

    if (error) {
      if (authUserId && admin) await admin.auth.admin.deleteUser(authUserId)
      errors.push({ row: rowNumber, message: error.message })
      skipped += 1
      continue
    }

    imported += 1
    nextNumber += 1
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "import",
      entityType: "employee",
      summary: `Imported ${imported} employee(s) from CSV`,
      metadata: { imported, skipped, error_count: errors.length },
    }
  )

  revalidatePath("/employees")
  revalidatePath("/import-export")
  revalidatePath("/feed")

  return { success: true, data: { imported, skipped, errors } }
}

export type ImportOutletsInput = { csv: string }

export async function importOutlets(
  input: ImportOutletsInput
): Promise<ActionResult<CsvImportResult>> {
  if (!input.csv?.trim()) return failure("Choose a CSV file with outlet rows.")

  const authorized = await getAuthorizedContext(PERMISSIONS.IMPORTS_EXECUTE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const parsed = parseCsv(input.csv)
  if (parsed.length < 2) return failure("The CSV must contain a header row and at least one outlet.")

  const map = headerMap(parsed[0])
  if (!map.has("code") || !map.has("name")) {
    return failure("The CSV must include code and name columns.")
  }

  const errors: CsvImportError[] = []
  let imported = 0
  let skipped = 0

  const { data: existingOutlets } = await supabase
    .from("outlets")
    .select("id, code")
    .eq("company_id", companyId)
  const distributorMap = new Map(
    ((existingOutlets ?? []) as { id: string; code: string }[]).map((outlet) => [
      outlet.code.toUpperCase(),
      outlet.id,
    ])
  )

  for (let index = 1; index < parsed.length; index += 1) {
    const row = parsed[index]
    const rowNumber = index + 1
    const code = cell(row, map, "code").toUpperCase()
    const name = cell(row, map, "name")

    if (!code || !name) {
      errors.push({ row: rowNumber, message: "code and name are required." })
      skipped += 1
      continue
    }

    const latitude = Number(cell(row, map, "latitude") || "14.5995")
    const longitude = Number(cell(row, map, "longitude") || "120.9842")
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      errors.push({ row: rowNumber, message: "Latitude/longitude are outside valid ranges." })
      skipped += 1
      continue
    }

    const radius = Number(cell(row, map, "geofence_radius_m") || "150")
    if (!Number.isFinite(radius) || radius <= 0) {
      errors.push({ row: rowNumber, message: "geofence_radius_m must be a positive number." })
      skipped += 1
      continue
    }

    const status = dbOutletStatus(cell(row, map, "status"))
    const isActiveCell = cell(row, map, "is_active").toLowerCase()
    const isActive =
      isActiveCell === ""
        ? status === "approved"
        : ["true", "1", "yes", "y"].includes(isActiveCell)
    const { error } = await supabase.from("outlets").insert({
      company_id: companyId,
      workspace_id: workspaceId,
      code,
      name,
      description: cell(row, map, "description") || null,
      address: cell(row, map, "address") || null,
      region: cell(row, map, "region") || null,
      province: cell(row, map, "province") || null,
      city: cell(row, map, "city") || null,
      barangay: cell(row, map, "barangay") || null,
      zip_code: cell(row, map, "zip_code") || null,
      is_distributor: ["true", "1", "yes", "y"].includes(
        cell(row, map, "is_distributor").toLowerCase()
      ),
      distributor_id: ["true", "1", "yes", "y"].includes(
        cell(row, map, "is_distributor").toLowerCase()
      )
        ? null
        : (distributorMap.get(cell(row, map, "distributor_code").toUpperCase()) ??
          null),
      contact_person: cell(row, map, "contact_person") || null,
      phone: cell(row, map, "phone") || null,
      email: cell(row, map, "email") || null,
      latitude,
      longitude,
      geofence_radius_m: radius,
      is_active: isActive,
      status,
      submitted_at: status === "pending_approval" ? new Date().toISOString() : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      created_by: userId,
    })

    if (error) {
      errors.push({
        row: rowNumber,
        message: error.code === "23505" ? `Outlet code "${code}" already exists.` : error.message,
      })
      skipped += 1
      continue
    }

    imported += 1
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "import",
      entityType: "outlet",
      summary: `Imported ${imported} outlet(s) from CSV`,
      metadata: { imported, skipped, error_count: errors.length },
    }
  )

  revalidatePath("/outlets")
  revalidatePath("/import-export")
  revalidatePath("/feed")

  return { success: true, data: { imported, skipped, errors } }
}
