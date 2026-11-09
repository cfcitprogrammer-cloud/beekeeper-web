import Link from "next/link"
import { ArrowLeft, CalendarClock, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { EmployeeSchedule } from "@/types/database"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function EmployeeScheduleDetail({ schedule, employeeName, shiftName }: { schedule: EmployeeSchedule; employeeName?: string | null; shiftName?: string | null }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/shifts/schedules" />}><ArrowLeft />Back to schedules</Button>
        <Button size="sm" render={<Link href={`/shifts/schedules/${schedule.id}/edit`} />}><Pencil />Edit schedule</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarClock className="size-5" /></span>
          <div><h2 className="text-lg font-semibold">{employeeName ?? "Employee"}</h2><p className="text-sm text-muted-foreground">{shiftName ?? "Shift"} · {schedule.days_of_week.map((d) => DAY_LABELS[d]).join(", ")}</p></div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Effective from</p><p className="text-sm">{schedule.effective_from}</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Effective to</p><p className="text-sm">{schedule.effective_to ?? "Ongoing"}</p></div>
        </div>
      </div>
    </div>
  )
}
