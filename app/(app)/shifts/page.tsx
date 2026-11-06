import { CalendarClock, Clock3, MoonStar, Timer } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ShiftsConfigurator } from "@/components/attendance/shifts-configurator"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getShifts } from "@/lib/data/queries"

export default async function ShiftsPage() {
  await requirePermission(PERMISSIONS.SHIFTS_VIEW)

  const result = await getShifts()
  const shifts = result.data
  const overnight = shifts.filter((shift) => shift.is_overnight)
  const averageBreak = shifts.length
    ? Math.round(
        shifts.reduce((sum, shift) => sum + shift.break_minutes, 0) /
          shifts.length
      )
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Time & attendance"
        title="Shift templates"
        description="Configure the working patterns, grace periods and break allowances used by scheduling and attendance."
        icon={CalendarClock}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Shift templates"
          value={shifts.length}
          hint="Reusable working patterns"
          icon={Clock3}
          accent="primary"
        />
        <MetricCard
          label="Overnight shifts"
          value={overnight.length}
          hint="Cross midnight"
          icon={MoonStar}
          accent="violet"
        />
        <MetricCard
          label="Average break"
          value={`${averageBreak}m`}
          hint="Across all templates"
          icon={Timer}
          accent="sky"
        />
        <MetricCard
          label="Grace allowance"
          value={`${shifts.length ? Math.round(shifts.reduce((sum, shift) => sum + shift.grace_minutes, 0) / shifts.length) : 0}m`}
          hint="Average lateness buffer"
          icon={CalendarClock}
          accent="emerald"
        />
      </div>

      <ShiftsConfigurator shifts={shifts} />
    </div>
  )
}
