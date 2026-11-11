import { Plus } from "lucide-react"

import { StageForm } from "@/components/production/stage-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionPipelines } from "@/lib/data/operations"

export default async function NewProductionStagePage({
  searchParams,
}: {
  searchParams: Promise<{ pipelineId?: string }>
}) {
  await requirePermission(PERMISSIONS.PRODUCTION_CREATE)

  const { pipelineId } = await searchParams
  const pipelinesResult = await getProductionPipelines()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="New production stage"
        description="Choose a pipeline and add the next stage in its sequence."
        icon={Plus}
      />
      <StageForm
        pipelines={pipelinesResult.data}
        defaultPipelineId={pipelineId}
      />
    </div>
  )
}
