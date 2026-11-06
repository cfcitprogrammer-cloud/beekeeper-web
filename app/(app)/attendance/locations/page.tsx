import { MapPin } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getWorkspaceContext, getWorkspaceLocations } from "@/lib/data/queries"
import { WorkspaceLocationsManager } from "@/components/attendance/workspace-locations-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function WorkspaceLocationsPage() {
  await requirePermission(PERMISSIONS.ATTENDANCE_VIEW)

  const [locationsResult, workspaceResult] = await Promise.all([
    getWorkspaceLocations(),
    getWorkspaceContext(),
  ])
  const locations = locationsResult.data
  const workspaces = workspaceResult.data.workspaces

  return (
    <>
      <PageHeader
        eyebrow="Time & attendance"
        title="Attendance locations"
        description="Manage geofenced attendance locations."
        icon={MapPin}
      />
      <WorkspaceLocationsManager locations={locations} workspaces={workspaces} />
    </>
  )
}