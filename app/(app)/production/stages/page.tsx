import { Layers } from "lucide-react"

import { StagesManager } from "@/components/production/stages-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions"
import {
  getProductionPipelines,
  getProductionStages,
} from "@/lib/data/operations"

export default async function ProductionStagesPage({
  searchParams,
}: {
  searchParams: Promise<{ pipelineId?: string }>
}) {
  const access = await requirePermission(PERMISSIONS.PRODUCTION_VIEW)

  const { pipelineId } = await searchParams
  const [stagesResult, pipelinesResult] = await Promise.all([
    getProductionStages(),
    getProductionPipelines(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Stages"
        description="Ordered pipeline stages, their units and the SKUs each stage can use."
        icon={Layers}
      />
      <StagesManager
        key={pipelineId ?? "all"}
        stages={stagesResult.data}
        pipelineOptions={pipelinesResult.data.map((pipeline) => ({
          id: pipeline.id,
          name: pipeline.name,
          code: pipeline.code,
        }))}
        initialPipelineId={pipelineId}
        canAssign={hasPermission(
          access.permissions,
          PERMISSIONS.PRODUCTION_UPDATE
        )}
        canCreate={hasPermission(
          access.permissions,
          PERMISSIONS.PRODUCTION_CREATE
        )}
      />
    </div>
  )
}
