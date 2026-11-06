import { UserCheck, UserPlus, Users, UserX } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { EmployeesDirectory } from "@/components/employees/employees-directory"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getDepartments, getEmployees } from "@/lib/data/queries"

export default async function EmployeesPage() {
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW)

  const [employeesResult, departmentsResult] = await Promise.all([
    getEmployees(),
    getDepartments(),
  ])

  const employees = employeesResult.data
  const departments = departmentsResult.data

  const active = employees.filter((employee) =>
    ["ACTIVE", "PROBATION"].includes(employee.status)
  ).length
  const probation = employees.filter(
    (employee) => employee.status === "PROBATION"
  ).length
  const onLeave = employees.filter(
    (employee) => employee.status === "ON_LEAVE"
  ).length
  const contractors = employees.filter((employee) =>
    ["CONTRACTOR", "CONSULTANT", "INTERN"].includes(employee.employment_type)
  ).length

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People"
        title="Employee directory"
        description="A single source of truth for every employee, contractor and intern across the workspace."
        icon={Users}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total employees"
          value={employees.length}
          hint={`${departments.length} departments`}
          icon={Users}
          accent="primary"
        />
        <MetricCard
          label="Active & probation"
          value={active}
          hint="Eligible for scheduling"
          icon={UserCheck}
          accent="emerald"
        />
        <MetricCard
          label="On probation"
          value={probation}
          hint="Regularization reviews due"
          icon={UserPlus}
          accent="amber"
        />
        <MetricCard
          label="Non-permanent"
          value={contractors}
          hint={`${onLeave} employees on leave`}
          icon={UserX}
          accent="violet"
        />
      </div>

      <EmployeesDirectory employees={employees} departments={departments} />
    </div>
  )
}
