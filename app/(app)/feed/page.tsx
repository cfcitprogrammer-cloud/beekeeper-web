import {
  Activity,
  AlertTriangle,
  Building2,
  MapPinOff,
  Store,
  Users,
} from "lucide-react"

import { ActivityFeedPanel } from "@/components/feed/activity-feed-panel"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getActivityFeed,
  getMonitoringSnapshot,
} from "@/actions/feed.action"

export default async function FeedPage() {
  const t0 = performance.now()
  const [, feedResult, monitoringResult] = await Promise.all([
    requirePermission(PERMISSIONS.FEED_VIEW),
    getActivityFeed(100),
    getMonitoringSnapshot(),
  ])
  console.log("[tmp-feed-page] data resolved in", Math.round(performance.now() - t0), "ms")

  const feed = feedResult.success ? feedResult.data : []
  const workspaces = monitoringResult.success ? monitoringResult.data : []
  const error = !feedResult.success
    ? feedResult.error
    : !monitoringResult.success
      ? monitoringResult.error
      : null

  const totals = workspaces.reduce(
    (accumulator, workspace) => ({
      activeEmployees: accumulator.activeEmployees + workspace.active_employees,
      activeOutlets: accumulator.activeOutlets + workspace.active_outlets,
      visitsToday: accumulator.visitsToday + workspace.visits_today,
      unplanned7d: accumulator.unplanned7d + workspace.unplanned_visits_7d,
      activity24h: accumulator.activity24h + workspace.activity_24h,
      openExpensePlans:
        accumulator.openExpensePlans + workspace.open_expense_plans,
      runsInProgress: accumulator.runsInProgress + workspace.runs_in_progress,
    }),
    {
      activeEmployees: 0,
      activeOutlets: 0,
      visitsToday: 0,
      unplanned7d: 0,
      activity24h: 0,
      openExpensePlans: 0,
      runsInProgress: 0,
    }
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Overview"
        title="Activity & monitoring"
        description="A chronological record of operational changes plus live workspace coverage indicators."
        icon={Activity}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active employees"
          value={totals.activeEmployees}
          hint={`${workspaces.length} workspace(s) monitored`}
          icon={Users}
          accent="primary"
        />
        <MetricCard
          label="Active outlets"
          value={totals.activeOutlets}
          hint="Approved and in coverage"
          icon={Store}
          accent="emerald"
        />
        <MetricCard
          label="Visits today"
          value={totals.visitsToday}
          hint={`${totals.unplanned7d} unplanned in 7 days`}
          icon={Building2}
          accent="sky"
        />
        <MetricCard
          label="Activity (24h)"
          value={totals.activity24h}
          hint={`${totals.openExpensePlans} open expense plans`}
          icon={Activity}
          accent="amber"
        />
      </div>

      {workspaces.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
              Workspace monitoring
            </p>
            <p className="font-heading text-sm font-semibold">
              Coverage, visits and production at a glance
            </p>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <div key={workspace.workspace_id} className="space-y-2 bg-card p-4">
                <p className="text-xs font-medium">{workspace.workspace_name}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.625rem] text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Employees</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {workspace.active_employees}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Outlets</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {workspace.active_outlets}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Assignments</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {workspace.active_assignments}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Visits today</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {workspace.visits_today}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="flex items-center gap-1">
                      <MapPinOff className="size-2.5" />
                      Unplanned 7d
                    </dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {workspace.unplanned_visits_7d}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Runs active</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {workspace.runs_in_progress}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Pending expenses</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {workspace.pending_expenses}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Activity 24h</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {workspace.activity_24h}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

      <ActivityFeedPanel items={feed} />

      <p className="text-[0.625rem] text-muted-foreground">
        Monitoring totals cover {workspaces.length} workspace(s).{" "}
        {totals.runsInProgress} production run(s) are currently in progress.
      </p>
    </div>
  )
}
