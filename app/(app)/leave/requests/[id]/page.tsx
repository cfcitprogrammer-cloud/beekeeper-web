import { notFound } from "next/navigation"
import { CalendarCheck2 } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { LeaveReviewForm } from "@/components/leave/leave-review-form"
import { PageHeader } from "@/components/shared/page-header"
import { getLeaveRequest } from "@/lib/data/queries"

export default async function LeaveRequestReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.LEAVE_REVIEW)
  const result = await getLeaveRequest(id)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="People & leave" title="Review leave request" description={`${result.data.employee.first_name} ${result.data.employee.last_name} · ${result.data.leave_type.name}`} icon={CalendarCheck2} /><LeaveReviewForm request={result.data} /></div>)
}
