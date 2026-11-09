import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { PipelineForm } from "@/components/production/pipeline-form"
import { PageHeader } from "@/components/shared/page-header"
import { getProductionPipeline } from "@/lib/data/operations"

export default async function EditPipelinePage({ params }: { params: Promise<{ pipelineId: string }> }) {
  const { pipelineId } = await params
  await requirePermission(PERMISSIONS.PRODUCTION_UPDATE)
  const result = await getProductionPipeline(pipelineId)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="Edit pipeline" description={`Update ${result.data.name}.`} icon={Pencil} /><PipelineForm pipeline={result.data} /></div>)
}
