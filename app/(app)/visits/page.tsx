import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  MapPinOff,
  Route,
} from "lucide-react"

import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getVisitPlans, getVisits } from "@/lib/data/operations"

export default async function VisitsPage() {
  const [, plansResult, visitsResult] = await Promise.all([
    requirePermission(PERMISSIONS.VISITS_VIEW),
    getVisitPlans(),
    getVisits(),
  ])

  const plans = plansResult.data ?? []
  const visits = visitsResult.data ?? []
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayVisits = visits.filter(
    (visit) => visit.start_date <= todayKey && visit.end_date >= todayKey
  )
  const unplanned = visits.filter((visit) => !visit.is_planned)
  const activePlans = plans.filter((plan) =>
    ["draft", "active"].includes(plan.status.toLowerCase())
  )

  const sections = [
    {
      title: "Visit log",
      description: "Scheduled visits with their outlet, check-in, check-out and status.",
      href: "/visits/log",
      icon: Route,
      count: `${visits.length} visits`,
      action: "Open visit log",
    },
    {
      title: "Visit plans",
      description: "Date ranges reserved for an employee. No target outlets required.",
      href: "/visits/plans",
      icon: CalendarClock,
      count: `${plans.length} plans`,
      action: "Open plans",
    },
    {
      title: "Add visit",
      description: "Schedule a visit at a specific outlet, with or without a plan.",
      href: "/visits/add",
      icon: CalendarPlus,
      count: `${todayVisits.length} scheduled today`,
      action: "Add visit",
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Visits"
        description="Plan visit date ranges, schedule visits at outlets, and check in/out with a photo capture."
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
          hint="No active plan for the employee/date"
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

      <div className="grid gap-3 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div key={section.href} className="rounded-xl border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <h2 className="mt-3 font-heading text-sm font-semibold">{section.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[0.625rem] text-muted-foreground">
                  {section.count}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={section.href} />}
                >
                  {section.action}
                  <ArrowRight />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
