/**
 * Permission catalog and helpers.
 *
 * Permission keys are stored in the `permissions` table (`key`, `description`)
 * and granted to roles through `role_permissions` (`role_id`, `permission_key`).
 * The keys below are the application-level catalog used to guard routes, nav
 * entries and server actions.
 */

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  DASHBOARD_CREATE: "dashboard.create",
  DASHBOARD_UPDATE: "dashboard.update",
  DASHBOARD_DELETE: "dashboard.delete",
  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_UPDATE: "employees.update",
  EMPLOYEES_DELETE: "employees.delete",
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_CREATE: "attendance.create",
  ATTENDANCE_UPDATE: "attendance.update",
  ATTENDANCE_DELETE: "attendance.delete",
  SHIFTS_VIEW: "shifts.view",
  SHIFTS_CREATE: "shifts.create",
  SHIFTS_UPDATE: "shifts.update",
  SHIFTS_DELETE: "shifts.delete",
  LEAVE_VIEW: "leave.view",
  LEAVE_CREATE: "leave.create",
  LEAVE_UPDATE: "leave.update",
  LEAVE_DELETE: "leave.delete",
  LEAVE_REVIEW: "leave.review",
  OUTLETS_VIEW: "outlets.view",
  OUTLETS_CREATE: "outlets.create",
  OUTLETS_UPDATE: "outlets.update",
  OUTLETS_DELETE: "outlets.delete",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_CREATE: "inventory.create",
  INVENTORY_UPDATE: "inventory.update",
  INVENTORY_DELETE: "inventory.delete",
  BOOKINGS_VIEW: "bookings.view",
  BOOKINGS_CREATE: "bookings.create",
  BOOKINGS_UPDATE: "bookings.update",
  BOOKINGS_DELETE: "bookings.delete",
  APPROVALS_VIEW: "approvals.view",
  APPROVALS_CREATE: "approvals.create",
  APPROVALS_UPDATE: "approvals.update",
  APPROVALS_DELETE: "approvals.delete",
  APPROVALS_DECIDE: "approvals.decide",
  APPROVALS_MANAGE: "approvals.manage",
  EXPENSES_VIEW: "expenses.view",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_UPDATE: "expenses.update",
  EXPENSES_DELETE: "expenses.delete",
  PRODUCTION_VIEW: "production.view",
  PRODUCTION_CREATE: "production.create",
  PRODUCTION_UPDATE: "production.update",
  PRODUCTION_DELETE: "production.delete",
  VISITS_VIEW: "visits.view",
  VISITS_CREATE: "visits.create",
  VISITS_UPDATE: "visits.update",
  VISITS_DELETE: "visits.delete",
  IMPORTS_VIEW: "imports.view",
  IMPORTS_EXECUTE: "imports.execute",
  FEED_VIEW: "feed.view",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type PermissionDefinition = {
  key: PermissionKey
  description: string
  group: string
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { key: PERMISSIONS.DASHBOARD_VIEW, description: "View the operations dashboard", group: "Overview" },
  { key: PERMISSIONS.DASHBOARD_CREATE, description: "Create dashboard widgets and layouts", group: "Overview" },
  { key: PERMISSIONS.DASHBOARD_UPDATE, description: "Update dashboard widgets and layouts", group: "Overview" },
  { key: PERMISSIONS.DASHBOARD_DELETE, description: "Delete dashboard widgets and layouts", group: "Overview" },
  { key: PERMISSIONS.EMPLOYEES_VIEW, description: "View the employee directory and profiles", group: "People" },
  { key: PERMISSIONS.EMPLOYEES_CREATE, description: "Onboard new employees", group: "People" },
  { key: PERMISSIONS.EMPLOYEES_UPDATE, description: "Update employee records and profiles", group: "People" },
  { key: PERMISSIONS.EMPLOYEES_DELETE, description: "Delete or deactivate employees", group: "People" },
  { key: PERMISSIONS.LEAVE_VIEW, description: "View leave balances", group: "People" },
  { key: PERMISSIONS.LEAVE_CREATE, description: "Create leave requests", group: "People" },
  { key: PERMISSIONS.LEAVE_UPDATE, description: "Update leave requests", group: "People" },
  { key: PERMISSIONS.LEAVE_DELETE, description: "Delete leave requests", group: "People" },
  { key: PERMISSIONS.LEAVE_REVIEW, description: "Approve or reject leave requests", group: "People" },
  { key: PERMISSIONS.ATTENDANCE_VIEW, description: "View the attendance feed and daily summary", group: "Time & attendance" },
  { key: PERMISSIONS.ATTENDANCE_CREATE, description: "Capture attendance records", group: "Time & attendance" },
  { key: PERMISSIONS.ATTENDANCE_UPDATE, description: "Update attendance records", group: "Time & attendance" },
  { key: PERMISSIONS.ATTENDANCE_DELETE, description: "Delete attendance records", group: "Time & attendance" },
  { key: PERMISSIONS.SHIFTS_VIEW, description: "View shift templates", group: "Time & attendance" },
  { key: PERMISSIONS.SHIFTS_CREATE, description: "Create shift templates", group: "Time & attendance" },
  { key: PERMISSIONS.SHIFTS_UPDATE, description: "Update shift templates", group: "Time & attendance" },
  { key: PERMISSIONS.SHIFTS_DELETE, description: "Delete shift templates", group: "Time & attendance" },
  { key: PERMISSIONS.OUTLETS_VIEW, description: "View the outlet directory", group: "Field operations" },
  { key: PERMISSIONS.OUTLETS_CREATE, description: "Add outlets for onboarding", group: "Field operations" },
  { key: PERMISSIONS.OUTLETS_UPDATE, description: "Update outlets", group: "Field operations" },
  { key: PERMISSIONS.OUTLETS_DELETE, description: "Delete outlets", group: "Field operations" },
  { key: PERMISSIONS.INVENTORY_VIEW, description: "View the SKU catalog", group: "Field operations" },
  { key: PERMISSIONS.INVENTORY_CREATE, description: "Create SKUs", group: "Field operations" },
  { key: PERMISSIONS.INVENTORY_UPDATE, description: "Update SKUs", group: "Field operations" },
  { key: PERMISSIONS.INVENTORY_DELETE, description: "Delete SKUs", group: "Field operations" },
  { key: PERMISSIONS.BOOKINGS_VIEW, description: "View the bookings register and booking details", group: "Field operations" },
  { key: PERMISSIONS.BOOKINGS_CREATE, description: "Create field bookings", group: "Field operations" },
  { key: PERMISSIONS.BOOKINGS_UPDATE, description: "Update booking status", group: "Field operations" },
  { key: PERMISSIONS.BOOKINGS_DELETE, description: "Delete bookings", group: "Field operations" },
  { key: PERMISSIONS.APPROVALS_VIEW, description: "View the approval inbox and history", group: "Governance" },
  { key: PERMISSIONS.APPROVALS_CREATE, description: "Create approval requests", group: "Governance" },
  { key: PERMISSIONS.APPROVALS_UPDATE, description: "Update approval requests", group: "Governance" },
  { key: PERMISSIONS.APPROVALS_DELETE, description: "Delete approval requests", group: "Governance" },
  { key: PERMISSIONS.APPROVALS_DECIDE, description: "Approve or reject approval requests", group: "Governance" },
  { key: PERMISSIONS.APPROVALS_MANAGE, description: "Manage approval templates", group: "Governance" },
  { key: PERMISSIONS.EXPENSES_VIEW, description: "View expense plans and expenses", group: "Operations" },
  { key: PERMISSIONS.EXPENSES_CREATE, description: "Create expense plans and expenses", group: "Operations" },
  { key: PERMISSIONS.EXPENSES_UPDATE, description: "Update expense plans and expenses", group: "Operations" },
  { key: PERMISSIONS.EXPENSES_DELETE, description: "Delete expense plans and expenses", group: "Operations" },
  { key: PERMISSIONS.PRODUCTION_VIEW, description: "View production pipelines and usage", group: "Operations" },
  { key: PERMISSIONS.PRODUCTION_CREATE, description: "Create production pipelines, stages and record usage", group: "Operations" },
  { key: PERMISSIONS.PRODUCTION_UPDATE, description: "Assign stage SKUs, record usage and update runs", group: "Operations" },
  { key: PERMISSIONS.PRODUCTION_DELETE, description: "Delete production pipelines, stages and runs", group: "Operations" },
  { key: PERMISSIONS.VISITS_VIEW, description: "View visits and visit plans", group: "Field operations" },
  { key: PERMISSIONS.VISITS_CREATE, description: "Create visit plans, visits and check-ins", group: "Field operations" },
  { key: PERMISSIONS.VISITS_UPDATE, description: "Check out or update visits", group: "Field operations" },
  { key: PERMISSIONS.VISITS_DELETE, description: "Delete visits and visit plans", group: "Field operations" },
  { key: PERMISSIONS.IMPORTS_VIEW, description: "View the import/export workspace", group: "Data" },
  { key: PERMISSIONS.IMPORTS_EXECUTE, description: "Import and export data", group: "Data" },
  { key: PERMISSIONS.FEED_VIEW, description: "View the activity feed and monitoring", group: "Overview" },
]

const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_CATALOG.map(
  (permission) => permission.key
)

export function hasPermission(
  permissions: readonly string[] | null | undefined,
  permission: PermissionKey
) {
  return Boolean(permissions?.includes(permission))
}

export function hasAnyPermission(
  permissions: readonly string[] | null | undefined,
  required: readonly PermissionKey[]
) {
  return required.some((permission) => hasPermission(permissions, permission))
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(value)
}

/**
 * Route guard map, ordered from most specific to least specific. Returns `null`
 * for paths that are not permission controlled (login, forbidden, assets).
 */
const ROUTE_PERMISSIONS: { prefix: string; permission: PermissionKey }[] = [
  { prefix: "/employees/departments/new", permission: PERMISSIONS.EMPLOYEES_CREATE },
  { prefix: "/employees/positions/new", permission: PERMISSIONS.EMPLOYEES_CREATE },
  { prefix: "/employees/new", permission: PERMISSIONS.EMPLOYEES_CREATE },
  { prefix: "/employees", permission: PERMISSIONS.EMPLOYEES_VIEW },
  { prefix: "/leave/requests", permission: PERMISSIONS.LEAVE_REVIEW },
  { prefix: "/leave/balances", permission: PERMISSIONS.LEAVE_VIEW },
  { prefix: "/leave/types/new", permission: PERMISSIONS.LEAVE_CREATE },
  { prefix: "/leave", permission: PERMISSIONS.LEAVE_VIEW },
  { prefix: "/attendance/holidays/new", permission: PERMISSIONS.ATTENDANCE_CREATE },
  { prefix: "/attendance/locations/new", permission: PERMISSIONS.ATTENDANCE_CREATE },
  { prefix: "/attendance", permission: PERMISSIONS.ATTENDANCE_VIEW },
  { prefix: "/shifts/schedules/new", permission: PERMISSIONS.SHIFTS_CREATE },
  { prefix: "/shifts/new", permission: PERMISSIONS.SHIFTS_CREATE },
  { prefix: "/shifts", permission: PERMISSIONS.SHIFTS_VIEW },
  { prefix: "/outlets/assignments/new", permission: PERMISSIONS.OUTLETS_CREATE },
  { prefix: "/outlets/assignments", permission: PERMISSIONS.OUTLETS_VIEW },
  { prefix: "/outlets/new", permission: PERMISSIONS.OUTLETS_CREATE },
  { prefix: "/outlets", permission: PERMISSIONS.OUTLETS_VIEW },
  { prefix: "/inventory/skus/new", permission: PERMISSIONS.INVENTORY_CREATE },
  { prefix: "/inventory/categories/new", permission: PERMISSIONS.INVENTORY_CREATE },
  { prefix: "/inventory", permission: PERMISSIONS.INVENTORY_VIEW },
  { prefix: "/bookings/new", permission: PERMISSIONS.BOOKINGS_CREATE },
  { prefix: "/bookings", permission: PERMISSIONS.BOOKINGS_VIEW },
  { prefix: "/expenses/items/new", permission: PERMISSIONS.EXPENSES_CREATE },
  { prefix: "/expenses/categories/new", permission: PERMISSIONS.EXPENSES_CREATE },
  { prefix: "/expenses/plans/new", permission: PERMISSIONS.EXPENSES_CREATE },
  { prefix: "/expenses", permission: PERMISSIONS.EXPENSES_VIEW },
  { prefix: "/production/pipelines/new", permission: PERMISSIONS.PRODUCTION_CREATE },
  { prefix: "/production/stages/new", permission: PERMISSIONS.PRODUCTION_CREATE },
  { prefix: "/production/usage/new", permission: PERMISSIONS.PRODUCTION_VIEW },
  { prefix: "/production/runs/new", permission: PERMISSIONS.PRODUCTION_CREATE },
  { prefix: "/production", permission: PERMISSIONS.PRODUCTION_VIEW },
  { prefix: "/visits/plans/new", permission: PERMISSIONS.VISITS_CREATE },
  { prefix: "/visits/add", permission: PERMISSIONS.VISITS_CREATE },
  { prefix: "/visits", permission: PERMISSIONS.VISITS_VIEW },
  { prefix: "/import-export", permission: PERMISSIONS.IMPORTS_VIEW },
  { prefix: "/feed", permission: PERMISSIONS.FEED_VIEW },
  { prefix: "/approvals/templates/new", permission: PERMISSIONS.APPROVALS_MANAGE },
  { prefix: "/approvals/templates", permission: PERMISSIONS.APPROVALS_MANAGE },
  { prefix: "/approvals/stages/new", permission: PERMISSIONS.APPROVALS_MANAGE },
  { prefix: "/approvals/stages", permission: PERMISSIONS.APPROVALS_MANAGE },
  { prefix: "/approvals/inbox", permission: PERMISSIONS.APPROVALS_VIEW },
  { prefix: "/approvals", permission: PERMISSIONS.APPROVALS_VIEW },
  { prefix: "/dashboard", permission: PERMISSIONS.DASHBOARD_VIEW },
]

export function permissionForPath(pathname: string): PermissionKey | null {
  const match = ROUTE_PERMISSIONS.find(
    (route) =>
      pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  )
  return match?.permission ?? null
}

export function canAccessPath(
  permissions: readonly string[] | null | undefined,
  pathname: string
) {
  const permission = permissionForPath(pathname)
  return permission ? hasPermission(permissions, permission) : true
}

/** The default landing route for every signed-in user. */
export function defaultRouteFor() {
  return "/home"
}
