import { redirect } from "next/navigation"

import { getAccessContext } from "./access"
import {
  hasAnyPermission,
  hasPermission,
  type PermissionKey,
} from "./permissions"

/**
 * Server-side route guard. Redirects unauthenticated users to the login page
 * and authenticated users without the required permission to `/forbidden`.
 */
export async function requirePermission(permission: PermissionKey) {
  const access = await getAccessContext()

  if (!access.user) {
    redirect("/login")
  }

  if (!hasPermission(access.permissions, permission)) {
    redirect("/forbidden")
  }

  return access
}

/**
 * Route guard that passes when the role has any one of the supplied
 * permissions.
 */
export async function requireAnyPermission(permissions: PermissionKey[]) {
  const access = await getAccessContext()

  if (!access.user) {
    redirect("/login")
  }

  if (!hasAnyPermission(access.permissions, permissions)) {
    redirect("/forbidden")
  }

  return access
}

/**
 * Server-side guard restricted to the seeded Super Admin role.
 */
export async function requireSuperAdmin() {
  const access = await getAccessContext()

  if (!access.user) {
    redirect("/login")
  }

  if (access.user.role !== "Super Admin") {
    redirect("/forbidden")
  }

  return access
}
