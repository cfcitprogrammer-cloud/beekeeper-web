import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { PipelineForm } from "@/components/production/pipeline-form"
import { PageHeader } from "@/components/shared/page-header"

export default async function NewPipelinePage() {
  await requirePermission(PERMISSIONS.PRODUCTION_CREATE)
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="New production pipeline" description="Define a production pipeline and its stages." icon={Plus} /><PipelineForm /></div>)
}
