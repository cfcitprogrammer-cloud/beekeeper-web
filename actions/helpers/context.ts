import { getAccessContext } from "@/lib/auth/access"
import { hasPermission, type PermissionKey } from "@/lib/auth/permissions"

export type ActionContext = {
  supabase: Awaited<ReturnType<typeof getAccessContext>>["supabase"]
  userId: string | null
  employee: {
    id: string
    company_id: string
    workspace_id: string
  } | null
  companyId: string | null
  workspaceId: string | null
  roleId: string | null
  roleName: string | null
  permissions: string[]
}

/**
 * Resolve the signed-in user plus their company, workspace and permissions.
 * Actions must use `getAuthorizedContext` so writes are always permission
 * checked against the user's role.
 */
export async function getActionContext(): Promise<ActionContext> {
  const access = await getAccessContext()

  return {
    supabase: access.supabase,
    userId: access.user?.id ?? null,
    employee: access.employee,
    companyId: access.companyId,
    workspaceId: access.workspaceId,
    roleId: access.user?.roleId ?? null,
    roleName: access.user?.role ?? null,
    permissions: access.permissions,
  }
}

export type ActionResult<T = undefined> =
  { success: true; data: T } | { success: false; error: string }

export function failure(error: string): ActionResult<never> {
  return { success: false, error }
}

export async function getAuthorizedContext(
  permission: PermissionKey
): Promise<{ context: ActionContext } | { error: ActionResult<never> }> {
  const context = await getActionContext()

  if (!context.userId) {
    return {
      error: failure("You must be signed in to perform this action."),
    }
  }

  if (!hasPermission(context.permissions, permission)) {
    return {
      error: failure("You do not have permission to perform this action."),
    }
  }

  if (!context.companyId) {
    return {
      error: failure("No company is associated with your account."),
    }
  }

  return { context }
}
