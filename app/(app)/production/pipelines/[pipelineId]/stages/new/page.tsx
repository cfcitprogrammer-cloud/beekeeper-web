import { notFound } from "next/navigation"
import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { StageForm } from "@/components/production/stage-form"
import { PageHeader } from "@/components/shared/page-header"
import { getProductionPipeline } from "@/lib/data/operations"

export default async function NewStagePage({ params }: { params: Promise<{ pipelineId: string }> }) {
  const { pipelineId } = await params
  await requirePermission(PERMISSIONS.PRODUCTION_CREATE)
  const result = await getProductionPipeline(pipelineId)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="Add production stage" description={result.data.name} icon={Plus} /><StageForm pipeline={result.data} /></div>)
}
