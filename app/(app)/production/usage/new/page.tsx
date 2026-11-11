import { FlaskConical } from "lucide-react"

import { UsageForm } from "@/components/production/usage-form"
import { PageHeader } from "@/components/shared/page-header"
import { requireAnyPermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionPipelines, getProductionStages } from "@/lib/data/operations"

export default async function NewProductionUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ pipelineId?: string }>
}) {
  await requireAnyPermission([
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])

  const { pipelineId } = await searchParams
  const [pipelinesResult, stagesResult] = await Promise.all([
    getProductionPipelines(),
    getProductionStages(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Record production usage"
        description="Pick a pipeline, then a stage, then enter usage for a SKU assigned to that stage."
        icon={FlaskConical}
      />
      <UsageForm
        key={pipelineId ?? "new"}
        pipelines={pipelinesResult.data}
        stages={stagesResult.data}
        defaultPipelineId={pipelineId}
        defaultDate={new Date().toISOString().slice(0, 10)}
      />
    </div>
  )
}
