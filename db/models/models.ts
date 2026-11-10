// Row types for the Supabase tables and views.
// uuid / timestamptz / date / time -> string, numeric / integer / double precision / real -> number,
// nullable column -> `| null`, Postgres enum -> string union.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type EmploymentStatus = "active" | "probation" | "on_leave" | "suspended" | "resigned" | "terminated"
export type EmploymentType = "full_time" | "part_time" | "contractual" | "intern" | "consultant"
export type AttendanceType = "clock_in" | "clock_out" | "break_start" | "break_end"
export type AttendanceSource = "mobile" | "manual" | "import"
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled"
export type HolidayType = "regular" | "special" | "company"
export type DocumentStatus = "draft" | "pending_approval" | "approved" | "rejected" | "cancelled"
export type ApprovalDocumentType = "booking" | "outlet"
export type StageStatus = "waiting" | "pending" | "approved" | "rejected" | "skipped"
export type ExpensePlanStatus = "draft" | "submitted" | "approved" | "rejected" | "closed"
export type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed" | "cancelled"
export type ProductionRunStatus = "planned" | "in_progress" | "completed" | "cancelled"
export type VisitPlanStatus = "draft" | "active" | "completed" | "cancelled"
export type VisitStatus = "checked_in" | "checked_out" | "cancelled"

// GeoJSON polygon, positions are [longitude, latitude]
export type GeoJsonPolygon = {
  type: "Polygon"
  coordinates: number[][][]
}

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------
export type Company = {
  id: string
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
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Workspace = {
  id: string
  company_id: string
  name: string
  code: string | null
  address: string | null
  timezone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WorkspaceLocation = {
  id: string
  company_id: string
  workspace_id: string
  name: string
  latitude: number
  longitude: number
  radius_m: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------
export type Permission = {
  key: string
  description: string | null
}

export type Role = {
  id: string
  company_id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

export type RolePermission = {
  role_id: string
  permission_key: string
}

export type CompanyMember = {
  user_id: string
  company_id: string
  role_id: string
  created_at: string
  updated_at: string
}

export type WorkspaceMember = {
  workspace_id: string
  user_id: string
  company_id: string
  role_id: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Organization + employees
// ---------------------------------------------------------------------------
export type Department = {
  id: string
  company_id: string
  name: string
  code: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
}

export type Position = {
  id: string
  company_id: string
  title: string
  description: string | null
  min_salary: number | null
  max_salary: number | null
  created_at: string
  updated_at: string
}

export type Employee = {
  id: string
  company_id: string
  workspace_id: string
  user_id: string | null
  employee_no: string
  sss_no: string | null
  philhealth_no: string | null
  tin_no: string | null
  pagibig_no: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  email: string | null
  phone: string | null
  birth_date: string | null
  gender: string | null
  civil_status: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  department_id: string | null
  position_id: string | null
  manager_id: string | null
  employment_type: EmploymentType
  status: EmploymentStatus
  hire_date: string | null
  regularization_date: string | null
  separation_date: string | null
  base_salary: number | null
  pay_frequency: string | null
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export type EmployeeDocument = {
  id: string
  company_id: string
  employee_id: string
  name: string
  category: string | null
  file_path: string
  expires_on: string | null
  uploaded_by: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------
export type Shift = {
  id: string
  company_id: string
  name: string
  start_time: string
  end_time: string
  break_minutes: number
  grace_minutes: number
  is_overnight: boolean
  created_at: string
  updated_at: string
}

export type EmployeeSchedule = {
  id: string
  company_id: string
  employee_id: string
  shift_id: string
  days_of_week: number[] // 0 = Sunday ... 6 = Saturday
  effective_from: string
  effective_to: string | null
  created_at: string
}

export type Holiday = {
  id: string
  company_id: string
  workspace_id: string | null
  holiday_date: string
  name: string
  type: HolidayType
  created_at: string
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
export type Attendance = {
  id: string
  company_id: string
  workspace_id: string
  employee_id: string
  type: AttendanceType
  source: AttendanceSource
  captured_at: string
  received_at: string
  latitude: number | null
  longitude: number | null
  accuracy_m: number | null
  altitude_m: number | null
  address_text: string | null
  is_mock_location: boolean
  location_id: string | null
  distance_m: number | null
  within_geofence: boolean | null
  photo_path: string | null
  device_id: string | null
  device_model: string | null
  os_version: string | null
  app_version: string | null
  status: ApprovalStatus
  remarks: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// view: attendance_daily
export type AttendanceDaily = {
  company_id: string
  workspace_id: string
  employee_id: string
  work_date: string
  first_in: string | null
  last_out: string | null
  hours_elapsed: number | null
  has_pending: boolean | null
}

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------
export type LeaveType = {
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

export type LeaveBalance = {
  id: string
  company_id: string
  employee_id: string
  leave_type_id: string
  year: number
  entitled: number
  used: number
  created_at: string
  updated_at: string
}

export type LeaveRequest = {
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
  status: ApprovalStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Outlets + inventory (SKUs)
// ---------------------------------------------------------------------------
export type Outlet = {
  id: string
  company_id: string
  workspace_id: string
  code: string
  name: string
  description: string | null
  address: string | null
  region: string | null
  province: string | null
  city: string | null
  barangay: string | null
  zip_code: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  latitude: number
  longitude: number
  geofence_radius_m: number
  geofence_polygon: GeoJsonPolygon | null
  photo_path: string | null
  is_active: boolean
  is_distributor: boolean
  distributor_id: string | null
  status: DocumentStatus
  submitted_at: string | null
  approved_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type SkuCategory = {
  id: string
  company_id: string
  name: string
  parent_id: string | null
  created_at: string
}

export type Sku = {
  id: string
  company_id: string
  sku_code: string
  barcode: string | null
  name: string
  description: string | null
  category_id: string | null
  brand: string | null
  uom: string
  unit_price: number
  tax_rate: number
  photo_path: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export type Booking = {
  id: string
  company_id: string
  workspace_id: string
  outlet_id: string
  employee_id: string
  booking_no: string
  booking_date: string
  delivery_date: string | null
  payment_terms: string | null
  notes: string | null
  line_count: number
  subtotal: number
  discount_total: number
  tax_total: number
  total: number
  captured_at: string | null
  latitude: number | null
  longitude: number | null
  accuracy_m: number | null
  is_mock_location: boolean
  distance_m: number | null
  within_geofence: boolean | null
  status: DocumentStatus
  submitted_at: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type BookingLine = {
  id: string
  company_id: string
  booking_id: string
  line_no: number
  sku_id: string
  quantity: number
  uom: string | null
  unit_price: number
  discount_pct: number
  tax_rate: number
  line_total: number // generated by the database
  notes: string | null
  created_at: string
}

export type DocumentCounter = {
  company_id: string
  doc_prefix: string
  last_no: number
}

// ---------------------------------------------------------------------------
// Approvals: configuration
// ---------------------------------------------------------------------------
export type ApprovalStage = {
  id: string
  company_id: string
  name: string
  description: string | null
  required_approvals: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ApprovalStageApprover = {
  id: string
  company_id: string
  stage_id: string
  user_id: string | null
  role_id: string | null
  created_at: string
}

export type ApprovalTemplate = {
  id: string
  company_id: string
  name: string
  description: string | null
  document_type: ApprovalDocumentType
  workspace_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ApprovalTemplateOriginator = {
  template_id: string
  user_id: string
  company_id: string
}

export type ApprovalTemplateStage = {
  id: string
  company_id: string
  template_id: string
  stage_id: string
  seq: number
}

export type ApprovalConditionOperator = "=" | "<>" | ">" | ">=" | "<" | "<="

export type ApprovalTemplateCondition = {
  id: string
  company_id: string
  template_id: string
  field: string
  operator: ApprovalConditionOperator
  value_numeric: number | null
  value_text: string | null
}

// ---------------------------------------------------------------------------
// Approvals: runtime (written only by submit_for_approval / decide_approval / withdraw_approval)
// ---------------------------------------------------------------------------
export type ApprovalRequest = {
  id: string
  company_id: string
  workspace_id: string
  template_id: string | null
  template_name: string
  document_type: ApprovalDocumentType
  document_id: string
  document_snapshot: Json
  requested_by: string
  status: ApprovalStatus
  created_at: string
  completed_at: string | null
}

export type ApprovalRequestStage = {
  id: string
  company_id: string
  request_id: string
  stage_id: string
  stage_name: string
  seq: number
  required_approvals: number
  status: StageStatus
  completed_at: string | null
}

export type ApprovalDecision = {
  id: string
  company_id: string
  request_id: string
  request_stage_id: string
  decided_by: string
  decision: "approved" | "rejected"
  remarks: string | null
  decided_at: string
}

// view: my_pending_approvals (the approver inbox)
export type MyPendingApproval = {
  request_stage_id: string
  request_id: string
  company_id: string
  workspace_id: string
  document_type: ApprovalDocumentType
  document_id: string
  template_name: string
  seq: number
  stage_name: string
  required_approvals: number
  approvals_received: number
  requested_by: string
  requested_at: string
  document_snapshot: Json
}

// ---------------------------------------------------------------------------
// Outlet assignments
// ---------------------------------------------------------------------------
export type EmployeeOutletAssignment = {
  id: string
  company_id: string
  workspace_id: string
  employee_id: string
  outlet_id: string
  assigned_by: string | null
  assigned_at: string
  unassigned_at: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export type ExpensePlan = {
  id: string
  company_id: string
  workspace_id: string
  employee_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  status: ExpensePlanStatus
  currency: string
  total_amount: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ExpenseCategory = {
  id: string
  company_id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ExpenseAttachment = {
  id: string
  company_id: string
  expense_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_by: string | null
  created_at: string
}

export type Expense = {
  id: string
  company_id: string
  workspace_id: string
  plan_id: string | null
  employee_id: string
  expense_date: string
  category: string
  category_id: string | null
  description: string
  amount: number
  currency: string
  receipt_path: string | null
  is_reimbursable: boolean
  status: ExpenseStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Production usage
// ---------------------------------------------------------------------------
export type ProductionPipeline = {
  id: string
  company_id: string
  workspace_id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ProductionStage = {
  id: string
  company_id: string
  pipeline_id: string
  name: string
  sequence: number
  stage_type: string
  input_uom: string | null
  output_uom: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type ProductionRun = {
  id: string
  company_id: string
  workspace_id: string
  pipeline_id: string
  run_no: string
  status: ProductionRunStatus
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ProductionUsage = {
  id: string
  company_id: string
  workspace_id: string
  pipeline_id: string
  run_id: string
  stage_id: string
  source_stage_id: string | null
  input_quantity: number
  output_quantity: number
  waste_quantity: number
  uom: string | null
  notes: string | null
  recorded_by: string | null
  recorded_at: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Visits
// ---------------------------------------------------------------------------
export type VisitPlan = {
  id: string
  company_id: string
  workspace_id: string
  employee_id: string
  name: string
  start_date: string
  end_date: string
  notes: string | null
  status: VisitPlanStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type VisitPlanOutlet = {
  id: string
  company_id: string
  plan_id: string
  outlet_id: string
  planned_date: string | null
  notes: string | null
  created_at: string
}

export type Visit = {
  id: string
  company_id: string
  workspace_id: string
  employee_id: string
  outlet_id: string
  plan_id: string | null
  is_planned: boolean
  planned_date: string | null
  check_in_at: string
  check_out_at: string | null
  check_in_latitude: number | null
  check_in_longitude: number | null
  check_out_latitude: number | null
  check_out_longitude: number | null
  check_in_distance_m: number | null
  notes: string | null
  status: VisitStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Activity feed + monitoring
// ---------------------------------------------------------------------------
export type ActivityFeed = {
  id: string
  company_id: string
  workspace_id: string | null
  actor_user_id: string | null
  actor_employee_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  metadata: Json
  created_at: string
}

// view: operational_monitoring
export type OperationalMonitoring = {
  company_id: string
  workspace_id: string
  workspace_name: string
  active_employees: number
  active_outlets: number
  active_assignments: number
  visits_today: number
  unplanned_visits_7d: number
  open_expense_plans: number
  pending_expenses: number
  runs_in_progress: number
  activity_24h: number
}