import {
  CalendarDays,
  CalendarRange,
  Hourglass,
  TrendingDown,
} from "lucide-react"

import { LeaveBalancesMatrix } from "@/components/leave/leave-balances-matrix"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getDepartments, getLeaveBalances } from "@/lib/data/queries"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"

export default async function LeaveBalancesPage() {
  await requirePermission(PERMISSIONS.LEAVE_VIEW)

  const [balancesResult, departmentsResult] = await Promise.all([
    getLeaveBalances(),
    getDepartments(),
  ])
  const balances = balancesResult.data
  const departments = departmentsResult.data

  const totalEntitlement = balances.reduce(
    (sum, balance) =>
      sum + balance.entitlement_days + balance.carried_over_days,
    0
  )
  const totalUsed = balances.reduce(
    (sum, balance) => sum + balance.used_days,
    0
  )
  const totalPending = balances.reduce(
    (sum, balance) => sum + balance.pending_days,
    0
  )
  const available = totalEntitlement - totalUsed - totalPending

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People"
        title="Leave balances"
        description="Workspace-wide entitlement, usage and pending leave across every leave type."
        icon={CalendarRange}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total entitlement"
          value={`${totalEntitlement.toFixed(0)}d`}
          hint="Including carry-over"
          icon={CalendarDays}
          accent="primary"
        />
        <MetricCard
          label="Days used"
          value={`${totalUsed.toFixed(0)}d`}
          hint="Approved leave this year"
          icon={TrendingDown}
          accent="sky"
        />
        <MetricCard
          label="Pending approval"
          value={`${totalPending.toFixed(0)}d`}
          hint="Not yet deducted"
          icon={Hourglass}
          accent="amber"
        />
        <MetricCard
          label="Available balance"
          value={`${available.toFixed(0)}d`}
          hint={`${balances.length} balance records`}
          icon={CalendarRange}
          accent="emerald"
        />
      </div>

      <LeaveBalancesMatrix balances={balances} departments={departments} />
    </div>
  )
}
