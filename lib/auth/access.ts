import { cache } from "react"

import { createClient } from "@/utils/supabase/server"
import type { Company, Workspace, WorkspaceLocation } from "@/types/database"

import { PERMISSIONS, type PermissionKey } from "./permissions"

type EmployeeRow = {
  id: string
  company_id: string
  workspace_id: string
  first_name: string
  last_name: string
  email: string | null
}

type CompanyMembershipRow = {
  company_id: string
  role_id: string
}

type WorkspaceMembershipRow = {
  workspace_id: string
  company_id: string
  role_id: string
}

type RoleRow = {
  id: string
  name: string
  is_system: boolean
}

export type AccessUser = {
  id: string
  email: string
  name: string
  initials: string
  role: string
  roleId: string | null
  permissions: string[]
}

export type AccessContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: AccessUser | null
  employee: EmployeeRow | null
  companyId: string | null
  workspaceId: string | null
  company: Company | null
  workspaces: Workspace[]
  locations: WorkspaceLocation[]
  permissions: string[]
}

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?"
  )
}

function displayName(
  employee: EmployeeRow | null,
  metadataName: string | undefined,
  email: string
) {
  if (employee) {
    return `${employee.first_name} ${employee.last_name}`.trim()
  }
  return metadataName?.trim() || email.split("@")[0] || "Workspace user"
}

/**
 * Resolve the signed-in user together with their company/workspace membership,
 * role and effective permissions.
 *
 * Permissions are read from `role_permissions` for the user's company role and
 * any workspace role they hold in the same company. System roles (`is_system`)
 * fall back to the full catalog when no explicit grants exist, which keeps the
 * built-in Owner/Admin roles usable before role permissions are configured.
 */
export const getAccessContext = cache(async (): Promise<AccessContext> => {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return {
      supabase,
      user: null,
      employee: null,
      companyId: null,
      workspaceId: null,
      company: null,
      workspaces: [],
      locations: [],
      permissions: [],
    }
  }

  const [employeeResult, companyMemberResult, workspaceMemberResult] =
    await Promise.all([
      supabase
        .from("employees")
        .select("id, company_id, workspace_id, first_name, last_name, email")
        .eq("user_id", authUser.id)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("company_id, role_id")
        .eq("user_id", authUser.id)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("workspace_id, company_id, role_id")
        .eq("user_id", authUser.id),
    ])

  const employee = (employeeResult.data as EmployeeRow | null) ?? null
  const companyMember =
    (companyMemberResult.data as CompanyMembershipRow | null) ?? null
  const workspaceMembers =
    (workspaceMemberResult.data as WorkspaceMembershipRow[] | null) ?? []

  const companyId =
    companyMember?.company_id ??
    employee?.company_id ??
    workspaceMembers[0]?.company_id ??
    null
  const workspaceId =
    employee?.workspace_id ??
    workspaceMembers.find((member) => member.company_id === companyId)
      ?.workspace_id ??
    null

  const email = employee?.email ?? authUser.email ?? ""
  const metadataName =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined)
  const name = displayName(employee, metadataName, email)

  if (!companyId) {
    return {
      supabase,
      user: {
        id: authUser.id,
        email,
        name,
        initials: initialsOf(name),
        role: "No role assigned",
        roleId: null,
        permissions: [],
      },
      employee,
      companyId: null,
      workspaceId,
      company: null,
      workspaces: [],
      locations: [],
      permissions: [],
    }
  }

  const companyWorkspaceMembers = workspaceMembers.filter(
    (member) => member.company_id === companyId
  )
  const roleIds = Array.from(
    new Set(
      [
        companyMember?.role_id,
        ...companyWorkspaceMembers.map((m) => m.role_id),
      ].filter((roleId): roleId is string => Boolean(roleId))
    )
  )

  const roleQuery =
    roleIds.length > 0
      ? supabase.from("roles").select("id, name, is_system").in("id", roleIds)
      : Promise.resolve({ data: [] as RoleRow[], error: null })
  const rolePermissionQuery =
    roleIds.length > 0
      ? supabase
          .from("role_permissions")
          .select("role_id, permission_key")
          .in("role_id", roleIds)
      : Promise.resolve({
          data: [] as { role_id: string; permission_key: string }[],
          error: null,
        })

  const [
    companyResult,
    workspaceResult,
    locationResult,
    roleResult,
    rolePermissionResult,
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
    supabase
      .from("workspaces")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("workspace_locations")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),
    roleQuery,
    rolePermissionQuery,
  ])

  const roles = (roleResult.data as RoleRow[] | null) ?? []
  const granted = Array.from(
    new Set(
      (
        (rolePermissionResult.data as
          { role_id: string; permission_key: string }[] | null) ?? []
      ).map((row) => row.permission_key)
    )
  )
  const hasSystemRole = roles.some((role) => role.is_system)
  const permissions: string[] =
    granted.length > 0
      ? granted
      : hasSystemRole
        ? (Object.values(PERMISSIONS) as PermissionKey[])
        : []

  const primaryRole =
    roles.find((role) => role.id === companyMember?.role_id) ?? roles[0]

  return {
    supabase,
    user: {
      id: authUser.id,
      email,
      name,
      initials: initialsOf(name),
      role: primaryRole?.name ?? "Team member",
      roleId: primaryRole?.id ?? null,
      permissions,
    },
    employee,
    companyId,
    workspaceId,
    company: (companyResult.data as Company | null) ?? null,
    workspaces: (workspaceResult.data as Workspace[] | null) ?? [],
    locations: (locationResult.data as WorkspaceLocation[] | null) ?? [],
    permissions,
  }
})
