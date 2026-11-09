import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { WorkspaceLocationForm } from "@/components/attendance/workspace-location-form"
import { PageHeader } from "@/components/shared/page-header"
import { getWorkspaceContext } from "@/lib/data/queries"

export default async function NewWorkspaceLocationPage() {
  await requirePermission(PERMISSIONS.ATTENDANCE_CREATE)
  const ws = await getWorkspaceContext()
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title="New location" description="Define a geofenced attendance location." icon={Plus} /><WorkspaceLocationForm workspaces={ws.data.workspaces} /></div>)
}
