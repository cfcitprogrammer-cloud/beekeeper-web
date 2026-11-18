import { getAccessContext } from "@/lib/auth/access"
import type { Workspace } from "@/types/database"

export type WorkspaceAccessUser = {
  userId: string
  name: string
  email: string | null
  employeeNo: string | null
  roleName: string | null
  isSuperAdmin: boolean
  homeWorkspaceId: string | null
  hasCompanyRole: boolean
  /** Explicit assignments. Empty means "all workspaces" (legacy default). */
  workspaceIds: string[]
}

export type WorkspaceAccessData = {
  workspaces: Workspace[]
  users: WorkspaceAccessUser[]
}

type MemberRow = {
  user_id: string
  role: { name: string; is_system: boolean } | null
}

type EmployeeRow = {
  user_id: string | null
  first_name: string
  last_name: string
  email: string | null
  employee_no: string | null
  workspace_id: string | null
}

type AssignmentRow = {
  user_id: string
  workspace_id: string
}

/**
 * Load the users who can sign in and the workspaces they are allowed to see.
 * Super Admin access is implicit, so those users are flagged instead of
 * relying on assignments.
 */
export async function getWorkspaceAccessData(): Promise<WorkspaceAccessData> {
  const access = await getAccessContext()
  const companyId = access.companyId

  if (!companyId) {
    return { workspaces: [], users: [] }
  }

  const [workspacesResult, membersResult, employeesResult, assignmentsResult] =
    await Promise.all([
      access.supabase
        .from("workspaces")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name"),
      access.supabase
        .from("company_members")
        .select("user_id, role:roles(name,is_system)")
        .eq("company_id", companyId),
      access.supabase
        .from("employees")
        .select(
          "user_id, first_name, last_name, email, employee_no, workspace_id"
        )
        .eq("company_id", companyId)
        .not("user_id", "is", null)
        .order("first_name"),
      access.supabase
        .from("workspace_members")
        .select("user_id, workspace_id")
        .eq("company_id", companyId),
    ])

  if (workspacesResult.error) {
    console.error("[data:workspace-access:workspaces]", workspacesResult.error)
  }
  if (membersResult.error) {
    console.error("[data:workspace-access:members]", membersResult.error)
  }
  if (employeesResult.error) {
    console.error("[data:workspace-access:employees]", employeesResult.error)
  }
  if (assignmentsResult.error) {
    console.error(
      "[data:workspace-access:assignments]",
      assignmentsResult.error
    )
  }

  const workspaces = (workspacesResult.data as Workspace[] | null) ?? []
  const members = (membersResult.data as MemberRow[] | null) ?? []
  const employees = (employeesResult.data as EmployeeRow[] | null) ?? []
  const assignments = (assignmentsResult.data as AssignmentRow[] | null) ?? []

  const employeeByUserId = new Map(
    employees
      .filter(
        (employee): employee is EmployeeRow & { user_id: string } =>
          Boolean(employee.user_id)
      )
      .map((employee) => [employee.user_id, employee])
  )

  const assignmentsByUserId = new Map<string, Set<string>>()
  for (const assignment of assignments) {
    const set = assignmentsByUserId.get(assignment.user_id) ?? new Set<string>()
    set.add(assignment.workspace_id)
    assignmentsByUserId.set(assignment.user_id, set)
  }

  const memberIds = new Set(members.map((member) => member.user_id))
  // Include login accounts that have an employee profile but no company role
  // yet so administrators can see them and assign a role first.
  const userIds = new Set<string>([
    ...members.map((member) => member.user_id),
    ...employees
      .filter((employee) => Boolean(employee.user_id))
      .map((employee) => employee.user_id as string),
    ...Array.from(assignmentsByUserId.keys()),
  ])

  const users: WorkspaceAccessUser[] = Array.from(userIds)
    .map((userId) => {
      const employee = employeeByUserId.get(userId)
      const member = members.find((row) => row.user_id === userId)
      const name = employee
        ? `${employee.first_name} ${employee.last_name}`.trim()
        : `User ${userId.slice(0, 8)}`

      return {
        userId,
        name: name || "Unnamed user",
        email: employee?.email ?? null,
        employeeNo: employee?.employee_no ?? null,
        roleName: member?.role?.name ?? null,
        isSuperAdmin: member?.role?.name === "Super Admin",
        homeWorkspaceId: employee?.workspace_id ?? null,
        workspaceIds: Array.from(
          assignmentsByUserId.get(userId) ?? []
        ).sort(),
        hasCompanyRole: memberIds.has(userId),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return { workspaces, users }
}
