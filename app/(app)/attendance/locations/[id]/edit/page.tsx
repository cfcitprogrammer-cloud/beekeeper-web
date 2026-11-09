import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { WorkspaceLocationForm } from "@/components/attendance/workspace-location-form"
import { PageHeader } from "@/components/shared/page-header"
import { getWorkspaceContext, getWorkspaceLocation } from "@/lib/data/queries"

export default async function EditWorkspaceLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.ATTENDANCE_UPDATE)
  const [result, ws] = await Promise.all([getWorkspaceLocation(id), getWorkspaceContext()])
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title="Edit location" description={`Update ${result.data.name}.`} icon={Pencil} /><WorkspaceLocationForm location={result.data} workspaces={ws.data.workspaces} /></div>)
}
