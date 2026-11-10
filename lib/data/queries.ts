import { cache } from "react"

import { getAccessContext } from "@/lib/auth/access"
import { createClient } from "@/utils/supabase/server"
import type {
  ApprovalHistoryItem,
  ApprovalStage,
  ApprovalStageApprover,
  ApprovalTemplateWithConfig,
  AttendanceDaily,
  AttendanceWithEmployee,
  BookingDetail,
  BookingWithRelations,
  Company,
  Department,
  Employee,
  EmployeeDocument,
  EmployeeSchedule,
  EmployeeWithRelations,
  LeaveBalanceWithRelations,
  LeaveRequestWithRelations,
  Holiday,
  LeaveType,
  MyPendingApproval,
  OutletWithRelations,
  Position,
  Shift,
  SkuCategory,
  SkuWithCategory,
  Workspace,
  WorkspaceLocation,
} from "@/types/database"

export type QueryResult<T> = {
  data: T
}

/* -------------------------------------------------------------------------- */
/*                              Mapping helpers                               */
/* -------------------------------------------------------------------------- */

function empty<T>(data: T): QueryResult<T> {
  return { data }
}

function logError(scope: string, error: { message?: string } | null) {
  if (error) console.error(`[data:${scope}]`, error.message ?? error)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

function mapEmploymentStatus(value: unknown): Employee["status"] {
  switch (String(value ?? "").toLowerCase()) {
    case "active":
      return "ACTIVE"
    case "probation":
      return "PROBATION"
    case "on_leave":
      return "ON_LEAVE"
    case "suspended":
      return "SUSPENDED"
    case "resigned":
      return "RESIGNED"
    case "terminated":
      return "TERMINATED"
    default:
      return "ACTIVE"
  }
}

function mapEmploymentType(value: unknown): Employee["employment_type"] {
  switch (String(value ?? "").toLowerCase()) {
    case "part_time":
      return "PART_TIME"
    case "contractual":
    case "contractor":
      return "CONTRACTOR"
    case "intern":
      return "INTERN"
    case "consultant":
      return "CONSULTANT"
    default:
      return "FULL_TIME"
  }
}

function mapPayFrequency(value: unknown): Employee["pay_frequency"] {
  switch (String(value ?? "").toLowerCase()) {
    case "semi_monthly":
      return "SEMI_MONTHLY"
    case "monthly":
      return "MONTHLY"
    case "weekly":
      return "WEEKLY"
    case "daily":
      return "DAILY"
    default:
      return null
  }
}

function mapGender(value: unknown): Employee["gender"] {
  const normalized = String(value ?? "").toLowerCase()
  switch (normalized) {
    case "male":
      return "MALE"
    case "female":
      return "FEMALE"
    case "non_binary":
      return "NON_BINARY"
    case "other":
      return "OTHER"
    case "prefer_not_to_say":
      return "PREFER_NOT_TO_SAY"
    default:
      return null
  }
}

function mapEmployee(row: Record<string, unknown>): EmployeeWithRelations {
  const department = row.department as EmployeeWithRelations["department"]
  const position = row.position as EmployeeWithRelations["position"]
  const manager = row.manager as EmployeeWithRelations["manager"]

  return {
    ...(row as unknown as Employee),
    status: mapEmploymentStatus(row.status),
    employment_type: mapEmploymentType(row.employment_type),
    pay_frequency: mapPayFrequency(row.pay_frequency),
    gender: mapGender(row.gender),
    department: department ?? null,
    position: position ?? null,
    manager: manager ?? null,
  }
}

function mapApprovalStatus(value: unknown): MyPendingApproval["status"] {
  switch (String(value ?? "").toLowerCase()) {
    case "approved":
      return "APPROVED"
    case "rejected":
      return "REJECTED"
    case "cancelled":
      return "CANCELLED"
    default:
      return "PENDING"
  }
}

function mapBookingStatus(value: unknown): BookingWithRelations["status"] {
  switch (String(value ?? "").toLowerCase()) {
    case "pending_approval":
      return "PENDING_APPROVAL"
    case "approved":
      return "APPROVED"
    case "rejected":
      return "REJECTED"
    case "cancelled":
      return "CANCELLED"
    default:
      return "DRAFT"
  }
}

function mapOutletStatus(
  row: Record<string, unknown>
): OutletWithRelations["status"] {
  const status = String(row.status ?? "").toLowerCase()
  if (status === "rejected") return "REJECTED"
  if (status === "cancelled") return "INACTIVE"
  if (row.is_active && status === "approved") return "ACTIVE"
  if (status === "approved") return "INACTIVE"
  return "PENDING"
}

function mapDocumentApprovalStatus(
  value: unknown
): OutletWithRelations["approval_status"] {
  switch (String(value ?? "").toLowerCase()) {
    case "approved":
      return "APPROVED"
    case "rejected":
      return "REJECTED"
    case "cancelled":
      return "CANCELLED"
    case "draft":
    case "pending_approval":
      return "PENDING"
    default:
      return null
  }
}

function mapDocumentType(value: unknown): MyPendingApproval["document_type"] {
  return String(value ?? "").toLowerCase() === "outlet" ? "OUTLET" : "BOOKING"
}

const leaveColors = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
]

function leaveColor(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997
  }
  return leaveColors[hash % leaveColors.length]
}

function snapshotString(snapshot: unknown, keys: string[]): string | null {
  const record = asRecord(snapshot)
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return null
}

function snapshotNumber(snapshot: unknown, keys: string[]): number {
  const record = asRecord(snapshot)
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value)
    }
  }
  return 0
}

async function getEmployeeNamesByUserId(
  userIds: string[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (userIds.length === 0) return names

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select("user_id, first_name, last_name")
    .in("user_id", userIds)

  logError("employee-names", error)

  for (const row of (data ?? []) as {
    user_id: string | null
    first_name: string
    last_name: string
  }[]) {
    if (row.user_id) {
      names.set(row.user_id, `${row.first_name} ${row.last_name}`)
    }
  }

  return names
}

/* -------------------------------------------------------------------------- */
/*                                Workspace                                   */
/* -------------------------------------------------------------------------- */

export type WorkspaceContext = {
  company: Company | null
  workspaces: Workspace[]
  locations: WorkspaceLocation[]
  user: {
    name: string
    email: string
    role: string
    initials: string
    roleId: string | null
    permissions: string[]
  }
}

export const getWorkspaceContext = cache(
  async (): Promise<QueryResult<WorkspaceContext>> => {
    const access = await getAccessContext()

    return empty({
      company: access.company,
      workspaces: access.workspaces,
      locations: access.locations,
      user: access.user ?? {
        name: "Workspace user",
        email: "",
        role: "Team member",
        initials: "?",
        roleId: null,
        permissions: [],
      },
    })
  }
)

export const getPendingApprovalsCount = cache(async (): Promise<number> => {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("my_pending_approvals")
    .select("request_stage_id", { count: "exact", head: true })

  logError("pending-count", error)
  return count ?? 0
})

/* -------------------------------------------------------------------------- */
/*                                HR & People                                 */
/* -------------------------------------------------------------------------- */

export async function getEmployees(): Promise<
  QueryResult<EmployeeWithRelations[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select(
      "*, department:departments(id,name,code), position:positions(id,title), manager:employees!manager_id(id,first_name,last_name)"
    )
    .order("last_name")

  logError("employees", error)
  if (error || !data) return empty([])

  return empty(
    (data as Record<string, unknown>[]).map((row) => mapEmployee(row))
  )
}

const ASSIGNABLE_EMPLOYEE_STATUSES = ["active", "probation", "on_leave"]
const ASSIGNABLE_EMPLOYEE_SELECT =
  "*, department:departments(id,name,code), position:positions(id,title), manager:employees!manager_id(id,first_name,last_name)"

/**
 * Only the first few employees are loaded for pickers. Callers must search for
 * the rest so large employee directories are never shipped to the client.
 */
export async function getAssignableEmployees(
  limit = 5
): Promise<QueryResult<EmployeeWithRelations[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select(ASSIGNABLE_EMPLOYEE_SELECT)
    .in("status", ASSIGNABLE_EMPLOYEE_STATUSES)
    .order("last_name")
    .limit(Math.max(1, limit))

  logError("assignable-employees", error)
  if (error || !data) return empty([])

  return empty(
    (data as Record<string, unknown>[]).map((row) => mapEmployee(row))
  )
}

export async function searchAssignableEmployees(
  term: string,
  limit = 20
): Promise<QueryResult<EmployeeWithRelations[]>> {
  const supabase = await createClient()
  const cleaned = term.trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ")
  let query = supabase
    .from("employees")
    .select(ASSIGNABLE_EMPLOYEE_SELECT)
    .in("status", ASSIGNABLE_EMPLOYEE_STATUSES)
    .order("last_name")
    .limit(Math.max(1, limit))

  if (cleaned) {
    const pattern = `%${cleaned}%`
    query = query.or(
      [
        `first_name.ilike.${pattern}`,
        `last_name.ilike.${pattern}`,
        `employee_no.ilike.${pattern}`,
        `email.ilike.${pattern}`,
      ].join(",")
    )
  }

  const { data, error } = await query

  logError("search-assignable-employees", error)
  if (error || !data) return empty([])

  return empty(
    (data as Record<string, unknown>[]).map((row) => mapEmployee(row))
  )
}

export async function getEmployee(
  id: string
): Promise<QueryResult<EmployeeWithRelations | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select(
      "*, department:departments(id,name,code), position:positions(id,title), manager:employees!manager_id(id,first_name,last_name)"
    )
    .eq("id", id)
    .maybeSingle()

  logError("employee", error)
  if (error || !data) return empty(null)

  return empty(mapEmployee(data as Record<string, unknown>))
}

export async function getEmployeeDocuments(
  employeeId: string
): Promise<QueryResult<EmployeeDocument[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employee_documents")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })

  logError("employee-documents", error)
  return empty((data as EmployeeDocument[] | null) ?? [])
}

export async function getDepartments(): Promise<QueryResult<Department[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name")

  logError("departments", error)
  return empty((data as Department[] | null) ?? [])
}

export async function getDepartment(
  id: string
): Promise<QueryResult<Department | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("department", error)
  return empty((data as Department | null) ?? null)
}

export async function getRoles(): Promise<QueryResult<{ id: string; name: string }[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("roles")
    .select("id, name")
    .order("name")

  logError("roles", error)
  return empty(((data as { id: string; name: string }[] | null) ?? []))
}


export async function getPositions(): Promise<QueryResult<Position[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .order("title")

  logError("positions", error)
  return empty((data as Position[] | null) ?? [])
}

export async function getPosition(
  id: string
): Promise<QueryResult<Position | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("position", error)
  return empty((data as Position | null) ?? null)
}

/* -------------------------------------------------------------------------- */
/*                          Scheduling & Attendance                           */
/* -------------------------------------------------------------------------- */

export async function getShifts(): Promise<QueryResult<Shift[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .order("start_time")

  logError("shifts", error)
  return empty((data as Shift[] | null) ?? [])
}

export async function getShift(id: string): Promise<QueryResult<Shift | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("shift", error)
  return empty((data as Shift | null) ?? null)
}

export async function getEmployeeSchedules(): Promise<QueryResult<EmployeeSchedule[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employee_schedules")
    .select("*")
    .order("effective_from", { ascending: false })

  logError("employee-schedules", error)
  return empty((data as EmployeeSchedule[] | null) ?? [])
}

export async function getEmployeeSchedule(
  id: string
): Promise<QueryResult<EmployeeSchedule | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employee_schedules")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("employee-schedule", error)
  return empty((data as EmployeeSchedule | null) ?? null)
}

type AttendanceEventRow = {
  id: string
  company_id: string
  workspace_id: string
  employee_id: string
  type: string
  source: string | null
  captured_at: string
  latitude: number | null
  longitude: number | null
  distance_m: number | null
  within_geofence: boolean | null
  is_mock_location: boolean | null
  location_id: string | null
  remarks: string | null
  created_at: string
  employee: AttendanceWithEmployee["employee"] | null
  location: AttendanceWithEmployee["location"]
}

export async function getAttendance(): Promise<
  QueryResult<AttendanceWithEmployee[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendances")
    .select(
      "*, employee:employees(id,employee_no,first_name,last_name,avatar_path), location:workspace_locations(id,name,radius_m)"
    )
    .order("captured_at", { ascending: true })

  logError("attendance", error)
  if (error || !data) return empty([])

  const grouped = new Map<string, AttendanceWithEmployee>()

  for (const row of data as AttendanceEventRow[]) {
    if (!row.employee) continue

    const day = row.captured_at.slice(0, 10)
    const key = `${row.employee_id}:${day}`
    const existing = grouped.get(key)

    if (!existing) {
      grouped.set(key, {
        id: row.id,
        company_id: row.company_id,
        workspace_id: row.workspace_id,
        employee_id: row.employee_id,
        location_id: row.location_id,
        clock_in_at: row.captured_at,
        clock_out_at: null,
        distance_m: row.distance_m,
        within_geofence: row.within_geofence ?? true,
        is_mock_location: row.is_mock_location ?? false,
        source:
          (String(row.source ?? "manual").toUpperCase() as
            "MOBILE" | "MANUAL" | "IMPORT") ?? "MANUAL",
        notes: row.remarks,
        created_at: row.created_at,
        employee: row.employee,
        location: row.location ?? null,
        shift: null,
      })
    }

    const current = grouped.get(key)!
    const type = String(row.type ?? "").toLowerCase()

    if (type === "clock_in" && row.captured_at < current.clock_in_at) {
      current.clock_in_at = row.captured_at
    }
    if (type === "clock_out") {
      current.clock_out_at = row.captured_at
    }
    if (row.location) current.location = row.location
    if (row.distance_m !== null) current.distance_m = row.distance_m
    if (row.within_geofence !== null)
      current.within_geofence = row.within_geofence
  }

  return empty(
    Array.from(grouped.values()).sort((a, b) =>
      b.clock_in_at.localeCompare(a.clock_in_at)
    )
  )
}

type AttendanceDailyRow = {
  employee_id: string
  workspace_id: string
  work_date: string
  first_in: string | null
  last_out: string | null
  hours_elapsed: number | null
  has_pending: boolean | null
}

export async function getAttendanceDaily(): Promise<
  QueryResult<AttendanceDaily[]>
> {
  const supabase = await createClient()

  const [dailyResult, employeeResult, departmentResult] = await Promise.all([
    supabase
      .from("attendance_daily")
      .select("*")
      .order("work_date", { ascending: false }),
    supabase
      .from("employees")
      .select("id, employee_no, first_name, last_name, department_id"),
    supabase.from("departments").select("id, name"),
  ])

  logError("attendance-daily", dailyResult.error)
  logError("attendance-daily-employees", employeeResult.error)
  logError("attendance-daily-departments", departmentResult.error)

  if (dailyResult.error || !dailyResult.data) return empty([])

  const employees = new Map(
    (
      (employeeResult.data ?? []) as {
        id: string
        employee_no: string
        first_name: string
        last_name: string
        department_id: string | null
      }[]
    ).map((employee) => [employee.id, employee])
  )
  const departments = new Map(
    ((departmentResult.data ?? []) as { id: string; name: string }[]).map(
      (department) => [department.id, department.name]
    )
  )

  const rows = (dailyResult.data as AttendanceDailyRow[]).map((row) => {
    const employee = employees.get(row.employee_id)
    const departmentName = employee?.department_id
      ? (departments.get(employee.department_id) ?? null)
      : null

    return {
      employee_id: row.employee_id,
      employee_no: employee?.employee_no ?? "—",
      employee_name: employee
        ? `${employee.first_name} ${employee.last_name}`
        : "Unknown employee",
      department_name: departmentName,
      workspace_id: row.workspace_id,
      work_date: row.work_date,
      first_in: row.first_in,
      last_out: row.last_out,
      hours_elapsed: row.hours_elapsed ?? 0,
      late_minutes: 0,
      overtime_minutes: 0,
      status: row.first_in ? "PRESENT" : "ABSENT",
      location_name: null,
    } satisfies AttendanceDaily
  })

  return empty(rows)
}

/* -------------------------------------------------------------------------- */
/*                                   Leave                                    */
/* -------------------------------------------------------------------------- */

type LeaveTypeRow = {
  id: string
  company_id: string
  name: string
  code: string
  is_paid: boolean
  default_days_per_year: number
  requires_approval: boolean
  carry_over_days: number
  created_at: string
  updated_at: string
}

function mapLeaveType(row: LeaveTypeRow): LeaveType {
  return {
    ...row,
    color: leaveColor(`${row.name}:${row.code}`),
  }
}

export async function getLeaveTypes(): Promise<QueryResult<LeaveType[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leave_types")
    .select("*")
    .order("name")

  logError("leave-types", error)
  return empty(((data as LeaveTypeRow[] | null) ?? []).map(mapLeaveType))
}

export async function getLeaveType(
  id: string
): Promise<QueryResult<LeaveType | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leave_types")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("leave-type", error)
  if (error || !data) return empty(null)
  return empty(mapLeaveType(data as LeaveTypeRow))
}

function mapHolidayRow(r: { id: string; company_id: string; workspace_id: string | null; holiday_date: string; name: string; type: string; created_at: string }): Holiday {
  return {
    id: r.id,
    company_id: r.company_id,
    workspace_id: r.workspace_id,
    holiday_date: r.holiday_date,
    name: r.name,
    type: r.type === "regular" ? "REGULAR" : r.type === "special" ? "SPECIAL" : "LOCAL",
    created_at: r.created_at,
  }
}

export async function getHolidays(): Promise<QueryResult<Holiday[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .order("holiday_date")

  logError("holidays", error)
  const rows = (data as { id: string; company_id: string; workspace_id: string | null; holiday_date: string; name: string; type: string; created_at: string }[] | null) ?? []
  return empty(rows.map(mapHolidayRow))
}

export async function getHoliday(id: string): Promise<QueryResult<Holiday | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("holiday", error)
  if (error || !data) return empty(null)
  return empty(mapHolidayRow(data as { id: string; company_id: string; workspace_id: string | null; holiday_date: string; name: string; type: string; created_at: string }))
}

type LeaveRequestRow = {
  id: string
  company_id: string
  workspace_id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days: number
  is_half_day: boolean
  reason: string | null
  attachment_path: string | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
  employee: {
    id: string
    employee_no: string
    first_name: string
    last_name: string
    avatar_path: string | null
    department_id: string | null
    department: { name: string } | null
  } | null
  leave_type: LeaveTypeRow | null
}

export async function getLeaveRequests(): Promise<
  QueryResult<LeaveRequestWithRelations[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "*, employee:employees(id,employee_no,first_name,last_name,avatar_path,department_id,department:departments(name)), leave_type:leave_types(*)"
    )
    .order("created_at", { ascending: false })

  logError("leave-requests", error)
  if (error || !data) return empty([])

  const rows = (data as LeaveRequestRow[])
    .filter((row) => row.employee && row.leave_type)
    .map((row) => ({
      id: row.id,
      company_id: row.company_id,
      workspace_id: row.workspace_id,
      employee_id: row.employee_id,
      leave_type_id: row.leave_type_id,
      start_date: row.start_date,
      end_date: row.end_date,
      days_count: row.days,
      is_half_day: row.is_half_day,
      reason: row.reason,
      status: mapApprovalStatus(row.status),
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      review_notes: row.review_note,
      attachment_url: row.attachment_path,
      created_at: row.created_at,
      updated_at: row.updated_at,
      employee: {
        id: row.employee!.id,
        employee_no: row.employee!.employee_no,
        first_name: row.employee!.first_name,
        last_name: row.employee!.last_name,
        avatar_path: row.employee!.avatar_path,
        department_id: row.employee!.department_id,
      },
      leave_type: {
        id: row.leave_type!.id,
        name: row.leave_type!.name,
        code: row.leave_type!.code,
        color: leaveColor(`${row.leave_type!.name}:${row.leave_type!.code}`),
        is_paid: row.leave_type!.is_paid,
      },
      department_name: row.employee!.department?.name ?? null,
    }))

  return empty(rows)
}

type LeaveBalanceRow = {
  id: string
  company_id: string
  employee_id: string
  leave_type_id: string
  year: number
  entitled: number
  used: number
  created_at: string
  updated_at: string
  employee: {
    id: string
    employee_no: string
    first_name: string
    last_name: string
    department_id: string | null
  } | null
  leave_type: LeaveTypeRow | null
}

export async function getLeaveBalances(): Promise<
  QueryResult<LeaveBalanceWithRelations[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leave_balances")
    .select(
      "*, employee:employees(id,employee_no,first_name,last_name,department_id), leave_type:leave_types(*)"
    )
    .order("year", { ascending: false })

  logError("leave-balances", error)
  if (error || !data) return empty([])

  const rows = (data as LeaveBalanceRow[])
    .filter((row) => row.employee && row.leave_type)
    .map((row) => ({
      id: row.id,
      company_id: row.company_id,
      employee_id: row.employee_id,
      leave_type_id: row.leave_type_id,
      year: row.year,
      entitlement_days: row.entitled,
      used_days: row.used,
      pending_days: 0,
      carried_over_days: 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      employee: row.employee!,
      leave_type: {
        id: row.leave_type!.id,
        name: row.leave_type!.name,
        code: row.leave_type!.code,
        color: leaveColor(`${row.leave_type!.name}:${row.leave_type!.code}`),
      },
    }))

  return empty(rows)
}

/* -------------------------------------------------------------------------- */
/*                          Outlets & Inventory                               */
export async function getWorkspaceLocations(): Promise<QueryResult<WorkspaceLocation[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspace_locations")
    .select("*")
    .order("name")

  logError("workspace-locations", error)
  return empty((data as WorkspaceLocation[] | null) ?? [])
}

export async function getWorkspaceLocation(
  id: string
): Promise<QueryResult<WorkspaceLocation | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspace_locations")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("workspace-location", error)
  return empty((data as WorkspaceLocation | null) ?? null)
}

export async function getWorkspaces(): Promise<QueryResult<Workspace[]>> {
  const supabase = await createClient()
  const access = await getAccessContext()
  if (!access.companyId) return empty([])
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("company_id", access.companyId)
    .order("name")

  logError("workspaces", error)
  return empty((data as Workspace[] | null) ?? [])
}

/* -------------------------------------------------------------------------- */

export async function getOutlets(): Promise<
  QueryResult<OutletWithRelations[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("outlets")
    .select("*")
    .order("name")

  logError("outlets", error)
  if (error || !data) return empty([])

  return empty(
    (data as Record<string, unknown>[]).map((row) => ({
      ...(row as unknown as OutletWithRelations),
      status: mapOutletStatus(row),
      approval_status: mapDocumentApprovalStatus(row.status),
    }))
  )
}

export async function getOutlet(
  id: string
): Promise<QueryResult<OutletWithRelations | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("outlets")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("outlet", error)
  if (error || !data) return empty(null)

  const row = data as Record<string, unknown>
  return empty({
    ...(row as unknown as OutletWithRelations),
    status: mapOutletStatus(row),
    approval_status: mapDocumentApprovalStatus(row.status),
  })
}

export async function getSkuCategories(): Promise<QueryResult<SkuCategory[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sku_categories")
    .select("*")
    .order("name")

  logError("sku-categories", error)
  return empty((data as SkuCategory[] | null) ?? [])
}

export async function getSkuCategory(
  id: string
): Promise<QueryResult<SkuCategory | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sku_categories")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("sku-category", error)
  return empty((data as SkuCategory | null) ?? null)
}

export async function getSkus(): Promise<QueryResult<SkuWithCategory[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("skus")
    .select("*, category:sku_categories(id,name)")
    .order("name")

  logError("skus", error)
  return empty((data as SkuWithCategory[] | null) ?? [])
}

export async function getSku(
  id: string
): Promise<QueryResult<SkuWithCategory | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("skus")
    .select("*, category:sku_categories(id,name)")
    .eq("id", id)
    .maybeSingle()

  logError("sku", error)
  return empty((data as SkuWithCategory | null) ?? null)
}

/* -------------------------------------------------------------------------- */
/*                                  Bookings                                  */
/* -------------------------------------------------------------------------- */

export async function getBookings(): Promise<
  QueryResult<BookingWithRelations[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "*, outlet:outlets(id,code,name,address), employee:employees(id,first_name,last_name,employee_no)"
    )
    .order("booking_date", { ascending: false })

  logError("bookings", error)
  if (error || !data) return empty([])

  const rows = (data as Record<string, unknown>[])
    .filter((row) => row.outlet && row.employee)
    .map((row) => ({
      ...(row as unknown as BookingWithRelations),
      status: mapBookingStatus(row.status),
    }))

  return empty(rows)
}

export async function getBooking(
  id: string
): Promise<QueryResult<BookingDetail | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "*, outlet:outlets(*), employee:employees(id,first_name,last_name,employee_no,email), booking_lines(*, sku:skus(id,sku_code,name,uom))"
    )
    .eq("id", id)
    .maybeSingle()

  logError("booking", error)
  if (error || !data) return empty(null)

  const row = data as unknown as BookingDetail

  return empty({
    ...row,
    status: mapBookingStatus(row.status),
    approval_status: null,
  })
}

/* -------------------------------------------------------------------------- */
/*                                  Approvals                                 */
/* -------------------------------------------------------------------------- */

type PendingApprovalRow = {
  request_stage_id: string
  request_id: string
  company_id: string
  workspace_id: string
  document_type: string
  document_id: string
  template_name: string
  seq: number
  stage_name: string
  required_approvals: number
  approvals_received: number
  requested_by: string
  requested_at: string
  document_snapshot: unknown
}

export async function getPendingApprovals(): Promise<
  QueryResult<MyPendingApproval[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("my_pending_approvals")
    .select("*")
    .order("requested_at", { ascending: true })

  logError("pending-approvals", error)
  if (error || !data) return empty([])

  const rows = data as PendingApprovalRow[]
  const names = await getEmployeeNamesByUserId(
    Array.from(new Set(rows.map((row) => row.requested_by)))
  )

  return empty(
    rows.map((row) => ({
      request_stage_id: row.request_stage_id,
      request_id: row.request_id,
      company_id: row.company_id,
      workspace_id: row.workspace_id,
      document_type: mapDocumentType(row.document_type),
      document_id: row.document_id,
      document_no:
        snapshotString(row.document_snapshot, [
          "booking_no",
          "document_no",
          "code",
          "name",
        ]) ?? row.document_id.slice(0, 8).toUpperCase(),
      title:
        snapshotString(row.document_snapshot, [
          "title",
          "name",
          "booking_no",
        ]) ?? row.template_name,
      amount: snapshotNumber(row.document_snapshot, [
        "total",
        "amount",
        "total_amount",
        "subtotal",
      ]),
      requested_by: row.requested_by,
      requested_by_name: names.get(row.requested_by) ?? "Workspace user",
      stage_name: row.stage_name,
      stage_sequence: row.seq,
      status: "PENDING",
      submitted_at: row.requested_at,
    }))
  )
}

type ApprovalRequestRow = {
  id: string
  document_type: string
  document_snapshot: unknown
  template_name: string
  requested_by: string
  status: string
  created_at: string
  completed_at: string | null
}

export async function getApprovalHistory(): Promise<
  QueryResult<ApprovalHistoryItem[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("approval_requests")
    .select(
      "id, document_type, document_snapshot, template_name, requested_by, status, created_at, completed_at"
    )
    .order("created_at", { ascending: false })
    .limit(50)

  logError("approval-history", error)
  if (error || !data) return empty([])

  const rows = data as ApprovalRequestRow[]
  const names = await getEmployeeNamesByUserId(
    Array.from(new Set(rows.map((row) => row.requested_by)))
  )

  return empty(
    rows.map((row) => ({
      id: row.id,
      document_no:
        snapshotString(row.document_snapshot, [
          "booking_no",
          "document_no",
          "code",
          "name",
        ]) ?? row.id.slice(0, 8).toUpperCase(),
      title:
        snapshotString(row.document_snapshot, [
          "title",
          "name",
          "booking_no",
        ]) ?? row.template_name,
      document_type: mapDocumentType(row.document_type),
      amount: snapshotNumber(row.document_snapshot, [
        "total",
        "amount",
        "total_amount",
        "subtotal",
      ]),
      status: mapApprovalStatus(row.status),
      submitted_at: row.created_at,
      completed_at: row.completed_at,
      requested_by_name: names.get(row.requested_by) ?? "Workspace user",
    }))
  )
}

type TemplateRow = {
  id: string
  company_id: string
  name: string
  description: string | null
  document_type: string
  workspace_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type TemplateStageRow = {
  id: string
  company_id: string
  template_id: string
  stage_id: string
  seq: number
  stage: ApprovalTemplateWithConfig["stages"][number]["stage"] | null
}

type TemplateConditionRow = {
  id: string
  company_id: string
  template_id: string
  field: string
  operator: string
  value_numeric: number | null
  value_text: string | null
}

type StageApproverRow = {
  id: string
  company_id: string
  stage_id: string
  user_id: string | null
  role_id: string | null
  created_at: string
}

export async function getApprovalTemplates(): Promise<
  QueryResult<ApprovalTemplateWithConfig[]>
> {
  const supabase = await createClient()
  const [templatesResult, stagesResult, conditionsResult, approversResult, originatorsResult] =
    await Promise.all([
      supabase.from("approval_templates").select("*").order("name"),
      supabase
        .from("approval_template_stages")
        .select("*, stage:approval_stages(*)")
        .order("seq"),
      supabase.from("approval_template_conditions").select("*"),
      supabase.from("approval_stage_approvers").select("*"),
      supabase.from("approval_template_originators").select("*"),
    ])

  logError("approval-templates", templatesResult.error)
  logError("approval-template-stages", stagesResult.error)
  logError("approval-template-conditions", conditionsResult.error)
  logError("approval-stage-approvers", approversResult.error)
  logError("approval-template-originators", originatorsResult.error)

  if (templatesResult.error || !templatesResult.data) return empty([])

  const stages = (stagesResult.data ?? []) as TemplateStageRow[]
  const conditions = (conditionsResult.data ?? []) as TemplateConditionRow[]
  const approvers = (approversResult.data ?? []) as StageApproverRow[]
  const originators = (originatorsResult.data ?? []) as { template_id: string; user_id: string }[]

  const data = (templatesResult.data as TemplateRow[]).map((template) => ({
    id: template.id,
    company_id: template.company_id,
    name: template.name,
    description: template.description,
    document_type: mapDocumentType(template.document_type),
    workspace_id: template.workspace_id,
    is_active: template.is_active,
    created_at: template.created_at,
    updated_at: template.updated_at,
    stages: stages
      .filter((stage) => stage.template_id === template.id && stage.stage)
      .sort((a, b) => a.seq - b.seq)
      .map((stage) => ({
        id: stage.id,
        company_id: stage.company_id,
        template_id: stage.template_id,
        stage_id: stage.stage_id,
        sequence: stage.seq,
        stage: stage.stage!,
        approvers: approvers.filter(
          (approver) => approver.stage_id === stage.stage_id
        ),
      })),
    conditions: conditions
      .filter((condition) => condition.template_id === template.id)
      .map((condition) => ({
        id: condition.id,
        company_id: condition.company_id,
        template_id: condition.template_id,
        field: condition.field,
        operator:
          condition.operator as ApprovalTemplateWithConfig["conditions"][number]["operator"],
        value:
          condition.value_numeric !== null
            ? String(condition.value_numeric)
            : (condition.value_text ?? ""),
      })),
    originators: originators
      .filter((o) => o.template_id === template.id)
      .map((o) => ({ user_id: o.user_id })),
  }))

  return empty(data)
}

export async function getApprovalStages(): Promise<QueryResult<ApprovalStage[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("approval_stages")
    .select("*")
    .order("name")

  logError("approval-stages", error)
  return empty((data as ApprovalStage[] | null) ?? [])
}

export async function getApprovalStage(
  id: string
): Promise<QueryResult<ApprovalStage | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("approval_stages")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  logError("approval-stage", error)
  return empty((data as ApprovalStage | null) ?? null)
}

export async function getApprovalStageApprovers(
  stageId: string
): Promise<QueryResult<ApprovalStageApprover[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("approval_stage_approvers")
    .select("*")
    .eq("stage_id", stageId)
    .order("created_at")

  logError("approval-stage-approvers", error)
  return empty((data as ApprovalStageApprover[] | null) ?? [])
}

export async function getPendingApproval(
  requestStageId: string
): Promise<QueryResult<MyPendingApproval | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("my_pending_approvals")
    .select("*")
    .eq("request_stage_id", requestStageId)
    .maybeSingle()

  logError("pending-approval", error)
  if (error || !data) return empty(null)

  const row = data as PendingApprovalRow
  const names = await getEmployeeNamesByUserId([row.requested_by])
  return empty({
    request_stage_id: row.request_stage_id,
    request_id: row.request_id,
    company_id: row.company_id,
    workspace_id: row.workspace_id,
    document_type: mapDocumentType(row.document_type),
    document_id: row.document_id,
    document_no:
      snapshotString(row.document_snapshot, [
        "booking_no",
        "document_no",
        "code",
        "name",
      ]) ?? row.document_id.slice(0, 8).toUpperCase(),
    title:
      snapshotString(row.document_snapshot, ["title", "name", "booking_no"]) ??
      row.template_name,
    amount: snapshotNumber(row.document_snapshot, [
      "total",
      "amount",
      "total_amount",
      "subtotal",
    ]),
    requested_by: row.requested_by,
    requested_by_name: names.get(row.requested_by) ?? "Workspace user",
    stage_name: row.stage_name,
    stage_sequence: row.seq,
    status: "PENDING",
    submitted_at: row.requested_at,
  })
}

export async function getLeaveRequest(
  id: string
): Promise<QueryResult<LeaveRequestWithRelations | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "*, employee:employees(id,employee_no,first_name,last_name,avatar_path,department_id,department:departments(name)), leave_type:leave_types(*)"
    )
    .eq("id", id)
    .maybeSingle()

  logError("leave-request", error)
  if (error || !data) return empty(null)

  const row = data as LeaveRequestRow
  if (!row.employee || !row.leave_type) return empty(null)
  return empty({
    id: row.id,
    company_id: row.company_id,
    workspace_id: row.workspace_id,
    employee_id: row.employee_id,
    leave_type_id: row.leave_type_id,
    start_date: row.start_date,
    end_date: row.end_date,
    days_count: row.days,
    is_half_day: row.is_half_day,
    reason: row.reason,
    status: mapApprovalStatus(row.status),
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    review_notes: row.review_note,
    attachment_url: row.attachment_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    employee: {
      id: row.employee.id,
      employee_no: row.employee.employee_no,
      first_name: row.employee.first_name,
      last_name: row.employee.last_name,
      avatar_path: row.employee.avatar_path,
      department_id: row.employee.department_id,
    },
    leave_type: {
      id: row.leave_type.id,
      name: row.leave_type.name,
      code: row.leave_type.code,
      color: leaveColor(`${row.leave_type.name}:${row.leave_type.code}`),
      is_paid: row.leave_type.is_paid,
    },
    department_name: row.employee.department?.name ?? null,
  })
}
