import Link from "next/link"
import {
  ArrowLeft,
  CalendarCheck2,
  Clock3,
  Timer,
  UserCheck,
  UserX,
} from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { DailySummaryTable } from "@/components/attendance/daily-summary-table"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { getAttendanceDaily } from "@/lib/data/queries"
import { formatDuration, percent } from "@/lib/format"

export default async function DailySummaryPage() {
  await requirePermission(PERMISSIONS.ATTENDANCE_VIEW)

  const result = await getAttendanceDaily()
  const rows = result.data
  const latestDate = rows.reduce<string | null>(
    (current, row) =>
      !current || row.work_date > current ? row.work_date : current,
    null
  )
  const today = latestDate
    ? rows.filter((row) => row.work_date === latestDate)
    : []

  const present = today.filter((row) =>
    ["PRESENT", "LATE", "REMOTE", "HALF_DAY"].includes(row.status)
  ).length
  const late = today.filter((row) => row.status === "LATE").length
  const absent = today.filter((row) => row.status === "ABSENT").length
  const onLeave = today.filter((row) => row.status === "ON_LEAVE").length
  const totalHours = today.reduce((sum, row) => sum + row.hours_elapsed, 0)
  const overtime = today.reduce((sum, row) => sum + row.overtime_minutes, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Time & attendance"
        title="Daily attendance summary"
        description="Reconciled daily roll-up of hours, lateness and overtime for payroll review."
        icon={CalendarCheck2}
        actions={
          <Button variant="outline" render={<Link href="/attendance" />}>
            <ArrowLeft />
            Live feed
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Present"
          value={`${present}/${today.length}`}
          hint={`${percent(present, today.length)}% of workforce`}
          icon={UserCheck}
          accent="emerald"
        />
        <MetricCard
          label="Late arrivals"
          value={late}
          hint={`${absent} absent · ${onLeave} on leave`}
          icon={Clock3}
          accent="amber"
        />
        <MetricCard
          label="Hours logged"
          value={formatDuration(totalHours)}
          hint={`${today.length} employee records`}
          icon={Timer}
          accent="sky"
        />
        <MetricCard
          label="Overtime"
          value={`${overtime}m`}
          hint="Pending payroll approval"
          icon={UserX}
          accent="violet"
        />
      </div>

      <DailySummaryTable rows={rows} />
    </div>
  )
}
