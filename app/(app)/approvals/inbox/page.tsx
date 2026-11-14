import {
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  ShieldCheck,
} from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ApprovalInbox } from "@/components/approvals/approval-inbox"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getApprovalHistory, getPendingApprovals } from "@/lib/data/queries"
import { formatCurrency } from "@/lib/format"

export default async function ApprovalInboxPage() {
  const [, pendingResult, historyResult] = await Promise.all([
    requirePermission(PERMISSIONS.APPROVALS_VIEW),
    getPendingApprovals(),
    getApprovalHistory(),
  ])
  const pending = pendingResult.data
  const history = historyResult.data

  const monetaryValue = pending.reduce((sum, item) => sum + item.amount, 0)
  const oldest = pending.reduce<string | null>((current, item) => {
    if (!current) return item.submitted_at
    return item.submitted_at < current ? item.submitted_at : current
  }, null)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Approval inbox"
        description="Review documents routed to your stage, with full context and audit-ready decisions."
        icon={ShieldCheck}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Awaiting decision"
          value={pending.length}
          hint="Across all document types"
          icon={ClipboardCheck}
          accent="amber"
        />
        <MetricCard
          label="Monetary value"
          value={formatCurrency(monetaryValue, true)}
          hint="Bookings and outlet onboarding"
          icon={CircleDollarSign}
          accent="emerald"
        />
        <MetricCard
          label="Oldest request"
          value={
            oldest
              ? new Date(oldest).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                })
              : "—"
          }
          hint={oldest ? "SLA clock running" : "Nothing waiting"}
          icon={Clock3}
          accent="rose"
        />
        <MetricCard
          label="Completed"
          value={history.length}
          hint="Recent decision history"
          icon={ShieldCheck}
          accent="sky"
        />
      </div>

      <ApprovalInbox pending={pending} history={history} />
    </div>
  )
}
