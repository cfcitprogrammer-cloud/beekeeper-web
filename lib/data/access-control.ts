import { getAccessContext } from "@/lib/auth/access"

export type ManagedRole = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissionKeys: string[]
}

export type RoleMember = {
  userId: string
  name: string
  email: string | null
  employeeNo: string | null
  roleId: string
  roleName: string
  isSystemRole: boolean
}

export type AccessCandidate = {
  userId: string
  name: string
  email: string | null
  employeeNo: string | null
}

export type RoleManagementData = {
  roles: ManagedRole[]
  members: RoleMember[]
  candidates: AccessCandidate[]
}

type RoleRow = {
  id: string
  name: string
  description: string | null
  is_system: boolean
  role_permissions: { permission_key: string }[] | null
}

type CompanyMemberRow = {
  user_id: string
  role_id: string
  role: {
    id: string
    name: string
    is_system: boolean
  } | null
}

type EmployeeAccessRow = {
  user_id: string | null
  first_name: string
  last_name: string
  email: string | null
  employee_no: string | null
}

function employeeName(employee: EmployeeAccessRow | undefined) {
  if (!employee) return null
  return `${employee.first_name} ${employee.last_name}`.trim()
}

/**
 * Load the roles, permission grants, company members and employees with a
 * login account that are still waiting for a role assignment.
 */
export async function getRoleManagementData(): Promise<RoleManagementData> {
  const access = await getAccessContext()
  const companyId = access.companyId

  if (!companyId) {
    return { roles: [], members: [], candidates: [] }
  }

  const [rolesResult, membersResult, employeesResult] = await Promise.all([
    access.supabase
      .from("roles")
      .select(
        "id, name, description, is_system, role_permissions(permission_key)"
      )
      .eq("company_id", companyId)
      .order("name"),
    access.supabase
      .from("company_members")
      .select("user_id, role_id, role:roles(id,name,is_system)")
      .eq("company_id", companyId),
    access.supabase
      .from("employees")
      .select("user_id, first_name, last_name, email, employee_no")
      .eq("company_id", companyId)
      .not("user_id", "is", null)
      .order("first_name"),
  ])

  if (rolesResult.error) {
    console.error("[data:managed-roles]", rolesResult.error.message)
  }
  if (membersResult.error) {
    console.error("[data:company-members]", membersResult.error.message)
  }
  if (employeesResult.error) {
    console.error("[data:access-employees]", employeesResult.error.message)
  }

  const roles: ManagedRole[] = (
    (rolesResult.data as RoleRow[] | null) ?? []
  ).map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.is_system,
    permissionKeys: (role.role_permissions ?? []).map(
      (permission) => permission.permission_key
    ),
  }))

  const employees = (employeesResult.data as EmployeeAccessRow[] | null) ?? []
  const employeeByUserId = new Map(
    employees
      .filter(
        (employee): employee is EmployeeAccessRow & { user_id: string } =>
          Boolean(employee.user_id)
      )
      .map((employee) => [employee.user_id, employee])
  )

  const memberRows = (membersResult.data as CompanyMemberRow[] | null) ?? []
  const members: RoleMember[] = memberRows
    .map((member) => {
      const employee = employeeByUserId.get(member.user_id)
      return {
        userId: member.user_id,
        name:
          employeeName(employee) ??
          member.role?.name ??
          `User ${member.user_id.slice(0, 8)}`,
        email: employee?.email ?? null,
        employeeNo: employee?.employee_no ?? null,
        roleId: member.role_id,
        roleName: member.role?.name ?? "Unknown role",
        isSystemRole: member.role?.is_system ?? false,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const memberIds = new Set(memberRows.map((member) => member.user_id))
  const candidates: AccessCandidate[] = employees
    .filter(
      (employee): employee is EmployeeAccessRow & { user_id: string } => {
        if (!employee.user_id) return false
        return !memberIds.has(employee.user_id)
      }
    )
    .map((employee) => ({
      userId: employee.user_id,
      name: employeeName(employee) ?? "Unnamed employee",
      email: employee.email,
      employeeNo: employee.employee_no,
    }))

  return { roles, members, candidates }
}
