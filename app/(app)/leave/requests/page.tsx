import { CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { LeaveReviewQueue } from "@/components/leave/leave-review-queue"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getLeaveRequests } from "@/lib/data/queries"

export default async function LeaveRequestsPage() {
  await requirePermission(PERMISSIONS.LEAVE_REVIEW)

  const result = await getLeaveRequests()
  const requests = result.data

  const pending = requests.filter((request) => request.status === "PENDING")
  const approved = requests.filter((request) => request.status === "APPROVED")
  const rejected = requests.filter((request) => request.status === "REJECTED")
  const daysRequested = pending.reduce(
    (sum, request) => sum + request.days_count,
    0
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People"
        title="Leave review queue"
        description="Approve or reject leave requests with coverage notes and a complete audit trail."
        icon={CalendarDays}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pending review"
          value={pending.length}
          hint={`${daysRequested} days requested`}
          icon={Clock3}
          accent="amber"
        />
        <MetricCard
          label="Approved"
          value={approved.length}
          hint="This review period"
          icon={CheckCircle2}
          accent="emerald"
        />
        <MetricCard
          label="Rejected"
          value={rejected.length}
          hint="With review notes"
          icon={XCircle}
          accent="rose"
        />
        <MetricCard
          label="Total requests"
          value={requests.length}
          hint="All leave types"
          icon={CalendarDays}
          accent="primary"
        />
      </div>

      <LeaveReviewQueue requests={requests} />
    </div>
  )
}
