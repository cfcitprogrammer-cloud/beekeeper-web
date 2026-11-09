import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { EmployeeScheduleForm } from "@/components/attendance/employee-schedule-form"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployees, getShifts } from "@/lib/data/queries"

export default async function NewEmployeeSchedulePage() {
  await requirePermission(PERMISSIONS.SHIFTS_CREATE)
  const [employeesResult, shiftsResult] = await Promise.all([getEmployees(), getShifts()])
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title="New schedule" description="Assign a shift to an employee on selected days." icon={Plus} /><EmployeeScheduleForm employees={employeesResult.data} shifts={shiftsResult.data} /></div>)
}
