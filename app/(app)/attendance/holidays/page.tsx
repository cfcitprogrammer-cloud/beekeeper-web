import { CalendarDays } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getHolidays, getWorkspaceContext } from "@/lib/data/queries"
import { HolidaysManager } from "@/components/attendance/holidays-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function HolidaysPage() {
  await requirePermission(PERMISSIONS.ATTENDANCE_VIEW)

  const [holidaysResult, workspaceResult] = await Promise.all([
    getHolidays(),
    getWorkspaceContext(),
  ])
  const holidays = holidaysResult.data
  const workspaces = workspaceResult.data.workspaces

  return (
    <>
      <PageHeader
        eyebrow="Time & attendance"
        title="Holidays"
        description="Manage company and workspace holidays."
        icon={CalendarDays}
      />
      <HolidaysManager holidays={holidays} workspaces={workspaces} />
    </>
  )
}