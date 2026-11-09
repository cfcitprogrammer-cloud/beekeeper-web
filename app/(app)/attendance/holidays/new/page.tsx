import { Plus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { HolidayForm } from "@/components/attendance/holiday-form"
import { PageHeader } from "@/components/shared/page-header"
import { getWorkspaceContext } from "@/lib/data/queries"

export default async function NewHolidayPage() {
  await requirePermission(PERMISSIONS.ATTENDANCE_CREATE)
  const ws = await getWorkspaceContext()
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Time & attendance" title="New holiday" description="Define a company or workspace holiday." icon={Plus} />
      <HolidayForm workspaces={ws.data.workspaces} />
    </div>
  )
}
