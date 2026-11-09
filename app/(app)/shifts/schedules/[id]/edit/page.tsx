import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { EmployeeScheduleForm } from "@/components/attendance/employee-schedule-form"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployeeSchedule, getEmployees, getShifts } from "@/lib/data/queries"

export default async function EditEmployeeSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.SHIFTS_UPDATE)
  const [scheduleResult, employeesResult, shiftsResult] = await Promise.all([getEmployeeSchedule(id), getEmployees(), getShifts()])
  if (!scheduleResult.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title="Edit schedule" description="Update shift assignment." icon={Pencil} /><EmployeeScheduleForm schedule={scheduleResult.data} employees={employeesResult.data} shifts={shiftsResult.data} /></div>)
}
