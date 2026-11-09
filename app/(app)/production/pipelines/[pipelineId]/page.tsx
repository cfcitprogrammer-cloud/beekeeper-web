import { notFound } from "next/navigation"
import { Factory } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { PipelineDetail } from "@/components/production/pipeline-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getProductionPipeline } from "@/lib/data/operations"

export default async function PipelineDetailPage({ params }: { params: Promise<{ pipelineId: string }> }) {
  const { pipelineId } = await params
  await requirePermission(PERMISSIONS.PRODUCTION_VIEW)
  const result = await getProductionPipeline(pipelineId)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title={result.data.name} description="Pipeline stages and production runs." icon={Factory} /><PipelineDetail pipeline={result.data} /></div>)
}
