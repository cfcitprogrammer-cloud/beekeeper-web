import { CalendarClock, CheckCircle2, MapPinOff, Route } from "lucide-react"

import { VisitsManager } from "@/components/visits/visits-manager"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getVisitPlans, getVisits } from "@/lib/data/operations"
import { getEmployees, getOutlets } from "@/lib/data/queries"

export default async function VisitsPage() {
  await requirePermission(PERMISSIONS.VISITS_VIEW)

  const [plansResult, visitsResult, employeesResult, outletsResult] =
    await Promise.all([
      getVisitPlans(),
      getVisits(),
      getEmployees(),
      getOutlets(),
    ])

  const plans = plansResult.data
  const visits = visitsResult.data
  const todayKey = new Date().toISOString().slice(0, 10)

  const todayVisits = visits.filter((visit) =>
    visit.check_in_at.startsWith(todayKey)
  )
  const unplanned = visits.filter((visit) => !visit.is_planned)
  const activePlans = plans.filter((plan) =>
    ["DRAFT", "ACTIVE"].includes(plan.status)
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Visits"
        description="Plan outlet coverage and record check-ins. Visits outside an active plan are automatically classified as unplanned."
        icon={Route}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active plans"
          value={activePlans.length}
          hint={`${plans.length} total plans`}
          icon={CalendarClock}
          accent="primary"
        />
        <MetricCard
          label="Visits today"
          value={todayVisits.length}
          hint={`${visits.length} in the log`}
          icon={CheckCircle2}
          accent="emerald"
        />
        <MetricCard
          label="Unplanned visits"
          value={unplanned.length}
          hint="No matching plan target"
          icon={MapPinOff}
          accent="amber"
        />
        <MetricCard
          label="Planned visits"
          value={visits.length - unplanned.length}
          hint="Matched an active plan"
          icon={Route}
          accent="sky"
        />
      </div>

      <VisitsManager
        plans={plans}
        visits={visits}
        employees={employeesResult.data}
        outlets={outletsResult.data}
      />
    </div>
  )
}
