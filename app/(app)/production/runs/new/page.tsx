import { Play } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { RunForm } from "@/components/production/run-form"
import { PageHeader } from "@/components/shared/page-header"
import { getProductionPipelines } from "@/lib/data/operations"

export default async function NewRunPage({ searchParams }: { searchParams: Promise<{ pipelineId?: string }> }) {
  await requirePermission(PERMISSIONS.PRODUCTION_CREATE)
  const { pipelineId } = await searchParams
  const pipelines = await getProductionPipelines()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="New production run" description="Start a run for a pipeline." icon={Play} /><RunForm pipelines={pipelines.data} defaultPipelineId={pipelineId} /></div>)
}
