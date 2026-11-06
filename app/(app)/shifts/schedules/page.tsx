import { CalendarClock } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getEmployeeSchedules, getEmployees, getShifts } from "@/lib/data/queries"
import { EmployeeSchedulesManager } from "@/components/attendance/employee-schedules-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function EmployeeSchedulesPage() {
  await requirePermission(PERMISSIONS.SHIFTS_VIEW)

  const [schedulesResult, employeesResult, shiftsResult] = await Promise.all([
    getEmployeeSchedules(),
    getEmployees(),
    getShifts(),
  ])
  const schedules = schedulesResult.data
  const employees = employeesResult.data
  const shifts = shiftsResult.data

  return (
    <>
      <PageHeader
        eyebrow="Time & attendance"
        title="Employee schedules"
        description="Assign shifts to employees."
        icon={CalendarClock}
      />
      <EmployeeSchedulesManager schedules={schedules} employees={employees} shifts={shifts} />
    </>
  )
}