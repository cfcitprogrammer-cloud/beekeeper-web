import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { EmployeeOnboardingForm } from "@/components/employees/employee-onboarding-form"
import { getDepartments, getEmployees, getPositions } from "@/lib/data/queries"

export default async function NewEmployeePage() {
  await requirePermission(PERMISSIONS.EMPLOYEES_CREATE)

  const [departmentsResult, positionsResult, employeesResult] =
    await Promise.all([getDepartments(), getPositions(), getEmployees()])

  const managers = employeesResult.data.filter((employee) =>
    ["ACTIVE", "PROBATION"].includes(employee.status)
  )

  return (
    <EmployeeOnboardingForm
      departments={departmentsResult.data}
      positions={positionsResult.data}
      managers={managers}
    />
  )
}
