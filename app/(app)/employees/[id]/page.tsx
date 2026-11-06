import { notFound } from "next/navigation"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { EmployeeProfile } from "@/components/employees/employee-profile"
import {
  getAttendance,
  getEmployee,
  getEmployeeDocuments,
  getLeaveBalances,
  getLeaveRequests,
} from "@/lib/data/queries"

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW)

  const [
    employeeResult,
    documentsResult,
    attendanceResult,
    leaveResult,
    balancesResult,
  ] = await Promise.all([
    getEmployee(id),
    getEmployeeDocuments(id),
    getAttendance(),
    getLeaveRequests(),
    getLeaveBalances(),
  ])

  if (!employeeResult.data) {
    notFound()
  }

  return (
    <EmployeeProfile
      employee={employeeResult.data}
      documents={documentsResult.data}
      attendance={attendanceResult.data}
      leaveRequests={leaveResult.data}
      leaveBalances={balancesResult.data}
    />
  )
}
