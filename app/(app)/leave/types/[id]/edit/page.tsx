import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { LeaveTypeForm } from "@/components/leave/leave-type-form"
import { PageHeader } from "@/components/shared/page-header"
import { getLeaveType } from "@/lib/data/queries"

export default async function EditLeaveTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.LEAVE_UPDATE)

  const result = await getLeaveType(id)
  if (!result.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People"
        title="Edit leave type"
        description={`Update ${result.data.name}.`}
        icon={Pencil}
      />
      <LeaveTypeForm leaveType={result.data} />
    </div>
  )
}
