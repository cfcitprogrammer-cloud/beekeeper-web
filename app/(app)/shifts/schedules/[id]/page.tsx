import { notFound } from "next/navigation"
import { CalendarClock } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { EmployeeScheduleDetail } from "@/components/attendance/employee-schedule-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployeeSchedule, getEmployees, getShifts } from "@/lib/data/queries"

export default async function EmployeeScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.SHIFTS_VIEW)
  const [scheduleResult, employeesResult, shiftsResult] = await Promise.all([getEmployeeSchedule(id), getEmployees(), getShifts()])
  if (!scheduleResult.data) notFound()
  const e = employeesResult.data.find((x) => x.id === scheduleResult.data!.employee_id)
  const s = shiftsResult.data.find((x) => x.id === scheduleResult.data!.shift_id)
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title="Schedule details" description={`${e ? `${e.first_name} ${e.last_name}` : "Employee"} schedule.`} icon={CalendarClock} /><EmployeeScheduleDetail schedule={scheduleResult.data} employeeName={e ? `${e.first_name} ${e.last_name}` : null} shiftName={s?.name ?? null} /></div>)
}
