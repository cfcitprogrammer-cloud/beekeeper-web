import { Plus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { LeaveTypeForm } from "@/components/leave/leave-type-form"
import { PageHeader } from "@/components/shared/page-header"

export default async function NewLeaveTypePage() {
  await requirePermission(PERMISSIONS.LEAVE_CREATE)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="People"
        title="New leave type"
        description="Configure a leave type for the company."
        icon={Plus}
      />
      <LeaveTypeForm />
    </div>
  )
}
