/**
 * Database + view-model types.
 *
 * Row shapes mirror the real Supabase schema in `db/models/models.ts`. The
 * UI-facing view models at the bottom are what the server queries map rows
 * into so the app screens can stay presentation-focused.
 */

import type * as Db from "@/db/models/models"

export type UUID = string
export type ISODate = string
export type ISODateTime = string

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

export const EMPLOYMENT_STATUSES = [
  "ACTIVE",
  "PROBATION",
  "ON_LEAVE",
  "SUSPENDED",
  "RESIGNED",
  "TERMINATED",
] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "INTERN",
  "CONSULTANT",
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export const GENDERS = [
  "MALE",
  "FEMALE",
  "NON_BINARY",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] as const
export type Gender = (typeof GENDERS)[number]

export const CIVIL_STATUSES = [
  "Single",
  "Married",
  "Widowed",
  "Divorced",
  "Separated",
] as const
export type CivilStatus = (typeof CIVIL_STATUSES)[number]

export const PAY_FREQUENCIES = [
  "SEMI_MONTHLY",
  "MONTHLY",
  "WEEKLY",
  "DAILY",
] as const
export type PayFrequency = (typeof PAY_FREQUENCIES)[number]

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "HALF_DAY",
  "ON_LEAVE",
  "REMOTE",
] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const LEAVE_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number]

export const OUTLET_STATUSES = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "REJECTED",
] as const
export type OutletStatus = (typeof OUTLET_STATUSES)[number]

export const BOOKING_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const APPROVAL_DECISIONS = ["APPROVED", "REJECTED"] as const
export type ApprovalDecisionValue = (typeof APPROVAL_DECISIONS)[number]

export const APPROVAL_DOCUMENT_TYPES = ["BOOKING", "OUTLET"] as const
export type ApprovalDocumentType = (typeof APPROVAL_DOCUMENT_TYPES)[number]

export const CONDITION_OPERATORS = ["=", "<>", ">", ">=", "<", "<="] as const
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number]

export const HOLIDAY_TYPES = ["REGULAR", "SPECIAL", "LOCAL"] as const
export type HolidayType = (typeof HOLIDAY_TYPES)[number]

export const MEMBER_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED"] as const
export type MemberStatus = (typeof MEMBER_STATUSES)[number]

/* -------------------------------------------------------------------------- */
/*                                  Tenancy                                   */
/* -------------------------------------------------------------------------- */

export interface Company {
  id: UUID
  name: string
  slug: string
  legal_name: string | null
  tax_id: string | null
  email: string | null
  phone: string | null
  address: string | null
  logo_path: string | null
  timezone: string
  currency: string
  is_active: boolean
  created_by: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Workspace {
  id: UUID
  company_id: UUID
  name: string
  code: string | null
  address: string | null
  timezone: string | null
  is_active: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface WorkspaceLocation {
  id: UUID
  company_id: UUID
  workspace_id: UUID
  name: string
  latitude: number
  longitude: number
  radius_m: number
  is_active: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

/* -------------------------------------------------------------------------- */
/*                               HR & Employees                               */
/* -------------------------------------------------------------------------- */

export interface Department {
  id: UUID
  company_id: UUID
  name: string
  code: string | null
  parent_id: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Position {
  id: UUID
  company_id: UUID
  title: string
  description: string | null
  min_salary: number | null
  max_salary: number | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Employee {
  id: UUID
  company_id: UUID
  workspace_id: UUID
  user_id: UUID | null
  employee_no: string
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  email: string | null
  phone: string | null
  birth_date: ISODate | null
  gender: Gender | null
  civil_status: CivilStatus | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  department_id: UUID | null
  position_id: UUID | null
  manager_id: UUID | null
  employment_type: EmploymentType
  status: EmploymentStatus
  hire_date: ISODate | null
  regularization_date: ISODate | null
  separation_date: ISODate | null
  base_salary: number | null
  pay_frequency: PayFrequency | null
  avatar_path: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface EmployeeDocument {
  id: UUID
  company_id: UUID
  employee_id: UUID
  name: string
  category: string | null
  file_path: string
  expires_on: ISODate | null
  uploaded_by: UUID | null
  created_at: ISODateTime
}

/* -------------------------------------------------------------------------- */
/*                          Scheduling & Attendance                           */
/* -------------------------------------------------------------------------- */

export interface Shift {
  id: UUID
  company_id: UUID
  name: string
  start_time: string
  end_time: string
  break_minutes: number
  grace_minutes: number
  is_overnight: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface EmployeeSchedule {
  id: UUID
  company_id: UUID
  employee_id: UUID
  shift_id: UUID
  days_of_week: number[]
  effective_from: ISODate
  effective_to: ISODate | null
  created_at: ISODateTime
}

export interface Holiday {
  id: UUID
  company_id: UUID
  workspace_id: UUID | null
  holiday_date: ISODate
  name: string
  type: HolidayType
  created_at: ISODateTime
}

/** Aggregated attendance row used by the live feed. */
export interface AttendanceWithEmployee {
  id: UUID
  company_id: UUID
  workspace_id: UUID
  employee_id: UUID
  location_id: UUID | null
  clock_in_at: ISODateTime
  clock_out_at: ISODateTime | null
  distance_m: number | null
  within_geofence: boolean
  is_mock_location: boolean
  source: "MOBILE" | "MANUAL" | "IMPORT"
  notes: string | null
  created_at: ISODateTime
  employee: Pick<
    Employee,
    "id" | "employee_no" | "first_name" | "last_name" | "avatar_path"
  >
  location: Pick<WorkspaceLocation, "id" | "name" | "radius_m"> | null
  shift: Pick<Shift, "id" | "name" | "start_time" | "end_time"> | null
}

/** Enriched row derived from the `attendance_daily` view. */
export interface AttendanceDaily {
  employee_id: UUID
  employee_no: string
  employee_name: string
  department_name: string | null
  workspace_id: UUID
  work_date: ISODate
  first_in: ISODateTime | null
  last_out: ISODateTime | null
  hours_elapsed: number
  late_minutes: number
  overtime_minutes: number
  status: AttendanceStatus
  location_name: string | null
}

/* -------------------------------------------------------------------------- */
/*                                   Leave                                    */
/* -------------------------------------------------------------------------- */

export interface LeaveType {
  id: UUID
  company_id: UUID
  name: string
  code: string
  is_paid: boolean
  default_days_per_year: number
  requires_approval: boolean
  carry_over_days: number
  /** Presentation colour derived from the leave type name. */
  color: string
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface LeaveBalance {
  id: UUID
  company_id: UUID
  employee_id: UUID
  leave_type_id: UUID
  year: number
  entitlement_days: number
  used_days: number
  pending_days: number
  carried_over_days: number
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface LeaveRequest {
  id: UUID
  company_id: UUID
  workspace_id: UUID
  employee_id: UUID
  leave_type_id: UUID
  start_date: ISODate
  end_date: ISODate
  days_count: number
  is_half_day: boolean
  reason: string | null
  status: LeaveRequestStatus
  reviewed_by: UUID | null
  reviewed_at: ISODateTime | null
  review_notes: string | null
  attachment_url: string | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

/* -------------------------------------------------------------------------- */
/*                          Outlets & Inventory                               */
/* -------------------------------------------------------------------------- */

export interface Outlet {
  id: UUID
  company_id: UUID
  workspace_id: UUID
  code: string
  name: string
  address: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  latitude: number
  longitude: number
  geofence_radius_m: number
  geofence_polygon: Db.GeoJsonPolygon | null
  photo_path: string | null
  is_active: boolean
  status: OutletStatus
  submitted_at: ISODateTime | null
  approved_at: ISODateTime | null
  created_by: UUID | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface SkuCategory {
  id: UUID
  company_id: UUID
  name: string
  parent_id: UUID | null
  created_at: ISODateTime
}

export interface Sku {
  id: UUID
  company_id: UUID
  sku_code: string
  barcode: string | null
  name: string
  description: string | null
  category_id: UUID | null
  brand: string | null
  uom: string
  unit_price: number
  tax_rate: number
  photo_path: string | null
  is_active: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

/* -------------------------------------------------------------------------- */
/*                                  Bookings                                  */
/* -------------------------------------------------------------------------- */

export interface Booking {
  id: UUID
  company_id: UUID
  workspace_id: UUID
  outlet_id: UUID
  employee_id: UUID
  booking_no: string
  booking_date: ISODate
  delivery_date: ISODate | null
  payment_terms: string | null
  notes: string | null
  line_count: number
  subtotal: number
  discount_total: number
  tax_total: number
  total: number
  captured_at: ISODateTime | null
  latitude: number | null
  longitude: number | null
  accuracy_m: number | null
  is_mock_location: boolean
  distance_m: number | null
  within_geofence: boolean | null
  status: BookingStatus
  submitted_at: ISODateTime | null
  approved_at: ISODateTime | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface BookingLine {
  id: UUID
  company_id: UUID
  booking_id: UUID
  line_no: number
  sku_id: UUID
  quantity: number
  uom: string | null
  unit_price: number
  discount_pct: number
  tax_rate: number
  line_total: number
  notes: string | null
  created_at: ISODateTime
}

export interface DocumentCounter {
  company_id: UUID
  doc_prefix: string
  last_no: number
}

/* -------------------------------------------------------------------------- */
/*                              Approvals engine                              */
/* -------------------------------------------------------------------------- */

export interface ApprovalStage {
  id: UUID
  company_id: UUID
  name: string
  description: string | null
  required_approvals: number
  is_active: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface ApprovalStageApprover {
  id: UUID
  company_id: UUID
  stage_id: UUID
  user_id: UUID | null
  role_id: UUID | null
  created_at: ISODateTime
}

export interface ApprovalTemplate {
  id: UUID
  company_id: UUID
  name: string
  description: string | null
  document_type: ApprovalDocumentType
  workspace_id: UUID | null
  is_active: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface ApprovalTemplateStage {
  id: UUID
  company_id: UUID
  template_id: UUID
  stage_id: UUID
  sequence: number
  stage: ApprovalStage
  approvers: ApprovalStageApprover[]
}

export interface ApprovalTemplateCondition {
  id: UUID
  company_id: UUID
  template_id: UUID
  field: string
  operator: ConditionOperator
  value: string
}

export interface ApprovalRequest {
  id: UUID
  company_id: UUID
  workspace_id: UUID
  template_id: UUID | null
  template_name: string
  document_type: ApprovalDocumentType
  document_id: UUID
  document_snapshot: Db.Json
  requested_by: UUID
  status: ApprovalStatus
  created_at: ISODateTime
  completed_at: ISODateTime | null
}

export interface ApprovalRequestStage {
  id: UUID
  company_id: UUID
  request_id: UUID
  stage_id: UUID
  stage_name: string
  seq: number
  required_approvals: number
  status: "WAITING" | "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED"
  completed_at: ISODateTime | null
}

export interface ApprovalDecision {
  id: UUID
  company_id: UUID
  request_id: UUID
  request_stage_id: UUID
  decided_by: UUID
  decision: ApprovalDecisionValue
  remarks: string | null
  decided_at: ISODateTime
}

export type ApprovalHistoryItem = {
  id: UUID
  document_no: string
  title: string
  document_type: ApprovalDocumentType
  amount: number
  status: ApprovalStatus
  submitted_at: ISODateTime
  completed_at: ISODateTime | null
  requested_by_name: string
}

/** Enriched row returned by the `my_pending_approvals` view. */
export interface MyPendingApproval {
  request_stage_id: UUID
  request_id: UUID
  company_id: UUID
  workspace_id: UUID
  document_type: ApprovalDocumentType
  document_id: UUID
  document_no: string
  title: string
  amount: number
  requested_by: UUID
  requested_by_name: string
  stage_name: string
  stage_sequence: number
  status: ApprovalStatus
  submitted_at: ISODateTime
}

/* -------------------------------------------------------------------------- */
/*                              Supabase client                               */
/* -------------------------------------------------------------------------- */

type TableDefinition<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

type ViewDefinition<Row> = {
  Row: Row
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      companies: TableDefinition<Db.Company>
      workspaces: TableDefinition<Db.Workspace>
      workspace_locations: TableDefinition<Db.WorkspaceLocation>
      permissions: TableDefinition<Db.Permission>
      roles: TableDefinition<Db.Role>
      role_permissions: TableDefinition<Db.RolePermission>
      company_members: TableDefinition<Db.CompanyMember>
      workspace_members: TableDefinition<Db.WorkspaceMember>
      departments: TableDefinition<Db.Department>
      positions: TableDefinition<Db.Position>
      employees: TableDefinition<Db.Employee>
      employee_documents: TableDefinition<Db.EmployeeDocument>
      shifts: TableDefinition<Db.Shift>
      employee_schedules: TableDefinition<Db.EmployeeSchedule>
      holidays: TableDefinition<Db.Holiday>
      attendances: TableDefinition<Db.Attendance>
      leave_types: TableDefinition<Db.LeaveType>
      leave_balances: TableDefinition<Db.LeaveBalance>
      leave_requests: TableDefinition<Db.LeaveRequest>
      outlets: TableDefinition<Db.Outlet>
      sku_categories: TableDefinition<Db.SkuCategory>
      skus: TableDefinition<Db.Sku>
      bookings: TableDefinition<Db.Booking>
      booking_lines: TableDefinition<Db.BookingLine>
      document_counters: TableDefinition<Db.DocumentCounter>
      approval_stages: TableDefinition<Db.ApprovalStage>
      approval_stage_approvers: TableDefinition<Db.ApprovalStageApprover>
      approval_templates: TableDefinition<Db.ApprovalTemplate>
      approval_template_stages: TableDefinition<Db.ApprovalTemplateStage>
      approval_template_conditions: TableDefinition<Db.ApprovalTemplateCondition>
      approval_requests: TableDefinition<Db.ApprovalRequest>
      approval_request_stages: TableDefinition<Db.ApprovalRequestStage>
      approval_decisions: TableDefinition<Db.ApprovalDecision>
    }
    Views: {
      attendance_daily: ViewDefinition<Db.AttendanceDaily>
      my_pending_approvals: ViewDefinition<Db.MyPendingApproval>
    }
    Functions: Record<string, never>
    Enums: {
      employment_status: Db.EmploymentStatus
      employment_type: Db.EmploymentType
      attendance_type: Db.AttendanceType
      attendance_source: Db.AttendanceSource
      approval_status: Db.ApprovalStatus
      approval_document_type: Db.ApprovalDocumentType
      document_status: Db.DocumentStatus
      stage_status: Db.StageStatus
      holiday_type: Db.HolidayType
    }
    CompositeTypes: Record<string, never>
  }
}

/* -------------------------------------------------------------------------- */
/*                          Enriched view-model types                         */
/* -------------------------------------------------------------------------- */

export type EmployeeWithRelations = Employee & {
  department: Pick<Department, "id" | "name" | "code"> | null
  position: Pick<Position, "id" | "title"> | null
  manager: Pick<Employee, "id" | "first_name" | "last_name"> | null
}

export type LeaveRequestWithRelations = LeaveRequest & {
  employee: Pick<
    Employee,
    "id" | "employee_no" | "first_name" | "last_name" | "avatar_path" | "department_id"
  >
  leave_type: Pick<LeaveType, "id" | "name" | "code" | "color" | "is_paid">
  department_name: string | null
}

export type LeaveBalanceWithRelations = LeaveBalance & {
  employee: Pick<
    Employee,
    "id" | "employee_no" | "first_name" | "last_name" | "department_id"
  >
  leave_type: Pick<LeaveType, "id" | "name" | "code" | "color">
}

export type BookingWithRelations = Booking & {
  outlet: Pick<Outlet, "id" | "code" | "name" | "address">
  employee: Pick<Employee, "id" | "first_name" | "last_name" | "employee_no">
}

export type BookingDetail = Booking & {
  outlet: Outlet
  employee: Pick<Employee, "id" | "first_name" | "last_name" | "employee_no" | "email">
  lines: (BookingLine & {
    sku: Pick<Sku, "id" | "sku_code" | "name" | "uom">
  })[]
  approval_status: ApprovalStatus | null
}

export type ApprovalTemplateWithConfig = ApprovalTemplate & {
  stages: ApprovalTemplateStage[]
  conditions: ApprovalTemplateCondition[]
}

export type SkuWithCategory = Sku & {
  category: Pick<SkuCategory, "id" | "name"> | null
}

export type OutletWithRelations = Outlet & {
  approval_status: ApprovalStatus | null
}
