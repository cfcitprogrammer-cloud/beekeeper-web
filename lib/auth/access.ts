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

type WorkspaceMembershipRow = {
  workspace_id: string
  company_id: string
  role_id: string | null
}

type RoleRow = {
  id: string
  name: string
  is_system: boolean
}

type RoleWithPermissions = RoleRow & {
  permissions?: { permission_key: string }[] | null
}

type CompanyBundle = Company & {
  workspaces?: Workspace[] | null
  workspace_locations?: WorkspaceLocation[] | null
}

type CompanyMembershipRow = {
  company_id: string
  role_id: string | null
  role: RoleWithPermissions | null
  company: CompanyBundle | null
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

function activeWorkspaces(company: CompanyBundle | null): Workspace[] {
  return [...(company?.workspaces ?? [])]
    .filter((workspace) => workspace.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
}

function activeLocations(company: CompanyBundle | null): WorkspaceLocation[] {
  return [...(company?.workspace_locations ?? [])]
    .filter((location) => location.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
}

function grantedPermissions(roles: RoleWithPermissions[]): string[] {
  return Array.from(
    new Set(
      roles.flatMap((role) =>
        (role.permissions ?? []).map((permission) => permission.permission_key)
      )
    )
  )
}

/**
 * Resolve the signed-in user together with their company/workspace membership,
 * role and effective permissions.
 *
 * The JWT is verified locally with `getClaims()` (the project uses asymmetric
 * signing keys), which avoids a network round trip to the Auth server on every
 * request that `getUser()` would incur.
 *
 * Membership, company, workspace and role data are fetched in as few Supabase
 * round trips as possible: the company bundle and the company-level role are
 * embedded in the `company_members` query, so the common case needs a single
 * data round trip. A follow-up query only runs when the user has additional
 * workspace roles or no company membership row.
 */
export const getAccessContext = cache(async (): Promise<AccessContext> => {
  const tmpStart = performance.now()
  console.log("[tmp-access] start")
  const supabase = await createClient()
  const {
    data: claimsData,
  } = await supabase.auth.getClaims()
  const claims = claimsData?.claims as
    | {
        sub?: string
        email?: string
        user_metadata?: Record<string, unknown>
      }
    | undefined

  const userId = claims?.sub

  if (!userId) {
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
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select(
          "company_id, role_id, role:roles(id,name,is_system,permissions:role_permissions(permission_key)), company:companies(*, workspaces(*), workspace_locations(*))"
        )
        .eq("user_id", userId)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("workspace_id, company_id, role_id")
        .eq("user_id", userId),
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

  const email = employee?.email ?? claims?.email ?? ""
  const metadataName =
    (claims?.user_metadata?.full_name as string | undefined) ??
    (claims?.user_metadata?.name as string | undefined)
  const name = displayName(employee, metadataName, email)

  if (!companyId) {
    return {
      supabase,
      user: {
        id: userId,
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
  const embeddedCompany = companyMember?.company ?? null
  const embeddedRole = companyMember?.role ?? null

  // Company roles and workspace roles both grant permissions. The company role
  // arrives embedded above; only workspace roles that differ need a lookup.
  const extraRoleIds = Array.from(
    new Set(
      companyWorkspaceMembers
        .map((member) => member.role_id)
        .filter(
          (roleId): roleId is string =>
            Boolean(roleId) && roleId !== embeddedRole?.id
        )
    )
  )
  const needsCompanyBundle = !embeddedCompany

  const [companyResult, extraRolesResult] = await Promise.all([
    needsCompanyBundle
      ? supabase
          .from("companies")
          .select("*, workspaces(*), workspace_locations(*)")
          .eq("id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    extraRoleIds.length > 0
      ? supabase
          .from("roles")
          .select(
            "id, name, is_system, permissions:role_permissions(permission_key)"
          )
          .in("id", extraRoleIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const company =
    embeddedCompany ??
    ((companyResult.data as CompanyBundle | null) ?? null)
  const roles: RoleWithPermissions[] = [
    ...(embeddedRole ? [embeddedRole] : []),
    ...((extraRolesResult.data as RoleWithPermissions[] | null) ?? []),
  ]

  const granted = grantedPermissions(roles)
  const hasSystemRole = roles.some((role) => role.is_system)
  const permissions: string[] =
    granted.length > 0
      ? granted
      : hasSystemRole
        ? (Object.values(PERMISSIONS) as PermissionKey[])
        : []

  const primaryRole =
    roles.find((role) => role.id === companyMember?.role_id) ?? roles[0]

  console.log("[tmp-access] done in", Math.round(performance.now() - tmpStart), "ms")
  return {
    supabase,
    user: {
      id: userId,
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
    company,
    workspaces: activeWorkspaces(company),
    locations: activeLocations(company),
    permissions,
  }
})
