import { notFound } from "next/navigation"
import { MapPin } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { WorkspaceLocationDetail } from "@/components/attendance/workspace-location-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getWorkspaceContext, getWorkspaceLocation } from "@/lib/data/queries"

export default async function WorkspaceLocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.ATTENDANCE_VIEW)
  const [result, ws] = await Promise.all([getWorkspaceLocation(id), getWorkspaceContext()])
  if (!result.data) notFound()
  const workspaceName = ws.data.workspaces.find((w) => w.id === result.data!.workspace_id)?.name ?? null
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title={result.data.name} description="Location details." icon={MapPin} /><WorkspaceLocationDetail location={result.data} workspaceName={workspaceName} /></div>)
}
