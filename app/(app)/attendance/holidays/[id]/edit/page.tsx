import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { HolidayForm } from "@/components/attendance/holiday-form"
import { PageHeader } from "@/components/shared/page-header"
import { getHoliday, getWorkspaceContext } from "@/lib/data/queries"

export default async function EditHolidayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.ATTENDANCE_UPDATE)
  const [result, ws] = await Promise.all([getHoliday(id), getWorkspaceContext()])
  if (!result.data) notFound()
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Time & attendance" title="Edit holiday" description={`Update ${result.data.name}.`} icon={Pencil} />
      <HolidayForm holiday={result.data} workspaces={ws.data.workspaces} />
    </div>
  )
}
