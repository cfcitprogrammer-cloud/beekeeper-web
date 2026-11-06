import { redirect } from "next/navigation"

import { getAccessContext } from "./access"
import { hasPermission, type PermissionKey } from "./permissions"

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
