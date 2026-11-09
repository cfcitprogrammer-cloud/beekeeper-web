import { notFound } from "next/navigation"
import { CalendarDays } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { LeaveTypeDetail } from "@/components/leave/leave-type-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getLeaveType } from "@/lib/data/queries"

export default async function LeaveTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.LEAVE_VIEW)

  const result = await getLeaveType(id)
  if (!result.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People"
        title={result.data.name}
        description="Leave type details."
        icon={CalendarDays}
      />
      <LeaveTypeDetail leaveType={result.data} />
    </div>
  )
}
