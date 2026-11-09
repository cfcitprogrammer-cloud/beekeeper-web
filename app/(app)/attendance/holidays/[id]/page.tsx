import { notFound } from "next/navigation"
import { CalendarDays } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { HolidayDetail } from "@/components/attendance/holiday-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getHoliday, getWorkspaceContext } from "@/lib/data/queries"

export default async function HolidayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.ATTENDANCE_VIEW)
  const [result, ws] = await Promise.all([getHoliday(id), getWorkspaceContext()])
  if (!result.data) notFound()
  const workspaceName = result.data.workspace_id ? ws.data.workspaces.find((w) => w.id === result.data!.workspace_id)?.name ?? null : null
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Time & attendance" title={result.data.name} description="Holiday details." icon={CalendarDays} />
      <HolidayDetail holiday={result.data} workspaceName={workspaceName} />
    </div>
  )
}
