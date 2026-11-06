import { CalendarDays } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getLeaveTypes } from "@/lib/data/queries"
import { LeaveTypesManager } from "@/components/leave/leave-types-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function LeaveTypesPage() {
  await requirePermission(PERMISSIONS.LEAVE_VIEW)

  const result = await getLeaveTypes()
  const leaveTypes = result.data

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Leave types"
        description="Configure the leave types available to employees."
        icon={CalendarDays}
      />
      <LeaveTypesManager leaveTypes={leaveTypes} />
    </>
  )
}