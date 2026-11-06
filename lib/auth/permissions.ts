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
  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  ATTENDANCE_VIEW: "attendance.view",
  SHIFTS_VIEW: "shifts.view",
  SHIFTS_CREATE: "shifts.create",
  LEAVE_VIEW: "leave.view",
  LEAVE_REVIEW: "leave.review",
  OUTLETS_VIEW: "outlets.view",
  OUTLETS_CREATE: "outlets.create",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_CREATE: "inventory.create",
  BOOKINGS_VIEW: "bookings.view",
  BOOKINGS_CREATE: "bookings.create",
  BOOKINGS_UPDATE: "bookings.update",
  APPROVALS_VIEW: "approvals.view",
  APPROVALS_DECIDE: "approvals.decide",
  APPROVALS_MANAGE: "approvals.manage",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type PermissionDefinition = {
  key: PermissionKey
  description: string
  group: string
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: PERMISSIONS.DASHBOARD_VIEW,
    description: "View the operations dashboard",
    group: "Overview",
  },
  {
    key: PERMISSIONS.EMPLOYEES_VIEW,
    description: "View the employee directory and profiles",
    group: "People",
  },
  {
    key: PERMISSIONS.EMPLOYEES_CREATE,
    description: "Onboard new employees",
    group: "People",
  },
  {
    key: PERMISSIONS.LEAVE_VIEW,
    description: "View leave balances",
    group: "People",
  },
  {
    key: PERMISSIONS.LEAVE_REVIEW,
    description: "Approve or reject leave requests",
    group: "People",
  },
  {
    key: PERMISSIONS.ATTENDANCE_VIEW,
    description: "View the attendance feed and daily summary",
    group: "Time & attendance",
  },
  {
    key: PERMISSIONS.SHIFTS_VIEW,
    description: "View shift templates",
    group: "Time & attendance",
  },
  {
    key: PERMISSIONS.SHIFTS_CREATE,
    description: "Create shift templates",
    group: "Time & attendance",
  },
  {
    key: PERMISSIONS.OUTLETS_VIEW,
    description: "View the outlet directory",
    group: "Field operations",
  },
  {
    key: PERMISSIONS.OUTLETS_CREATE,
    description: "Add outlets for onboarding",
    group: "Field operations",
  },
  {
    key: PERMISSIONS.INVENTORY_VIEW,
    description: "View the SKU catalog",
    group: "Field operations",
  },
  {
    key: PERMISSIONS.INVENTORY_CREATE,
    description: "Create SKUs",
    group: "Field operations",
  },
  {
    key: PERMISSIONS.BOOKINGS_VIEW,
    description: "View the bookings register and booking details",
    group: "Field operations",
  },
  {
    key: PERMISSIONS.BOOKINGS_CREATE,
    description: "Create field bookings",
    group: "Field operations",
  },
  {
    key: PERMISSIONS.BOOKINGS_UPDATE,
    description: "Update booking status",
    group: "Field operations",
  },
  {
    key: PERMISSIONS.APPROVALS_VIEW,
    description: "View the approval inbox and history",
    group: "Governance",
  },
  {
    key: PERMISSIONS.APPROVALS_DECIDE,
    description: "Approve or reject approval requests",
    group: "Governance",
  },
  {
    key: PERMISSIONS.APPROVALS_MANAGE,
    description: "Manage approval templates",
    group: "Governance",
  },
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
  { prefix: "/employees/new", permission: PERMISSIONS.EMPLOYEES_CREATE },
  { prefix: "/employees", permission: PERMISSIONS.EMPLOYEES_VIEW },
  { prefix: "/leave/requests", permission: PERMISSIONS.LEAVE_REVIEW },
  { prefix: "/leave/balances", permission: PERMISSIONS.LEAVE_VIEW },
  { prefix: "/leave", permission: PERMISSIONS.LEAVE_VIEW },
  { prefix: "/attendance", permission: PERMISSIONS.ATTENDANCE_VIEW },
  { prefix: "/shifts", permission: PERMISSIONS.SHIFTS_VIEW },
  { prefix: "/outlets", permission: PERMISSIONS.OUTLETS_VIEW },
  { prefix: "/inventory", permission: PERMISSIONS.INVENTORY_VIEW },
  { prefix: "/bookings", permission: PERMISSIONS.BOOKINGS_VIEW },
  { prefix: "/approvals/templates", permission: PERMISSIONS.APPROVALS_MANAGE },
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

/** The first route a user with these permissions can open. */
export function defaultRouteFor(
  permissions: readonly string[] | null | undefined
) {
  if (hasPermission(permissions, PERMISSIONS.DASHBOARD_VIEW))
    return "/dashboard"
  if (hasPermission(permissions, PERMISSIONS.EMPLOYEES_VIEW))
    return "/employees"
  if (hasPermission(permissions, PERMISSIONS.ATTENDANCE_VIEW))
    return "/attendance"
  if (hasPermission(permissions, PERMISSIONS.LEAVE_VIEW))
    return "/leave/balances"
  if (hasPermission(permissions, PERMISSIONS.OUTLETS_VIEW)) return "/outlets"
  if (hasPermission(permissions, PERMISSIONS.INVENTORY_VIEW))
    return "/inventory/skus"
  if (hasPermission(permissions, PERMISSIONS.BOOKINGS_VIEW)) return "/bookings"
  if (hasPermission(permissions, PERMISSIONS.APPROVALS_VIEW))
    return "/approvals/inbox"
  return "/forbidden"
}
