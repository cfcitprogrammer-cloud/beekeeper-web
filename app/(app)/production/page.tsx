import { Factory, FlaskConical, Play } from "lucide-react"

import { ProductionManager } from "@/components/production/production-manager"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionPipelines, getProductionUsage } from "@/lib/data/operations"

export default async function ProductionPage() {
  await requirePermission(PERMISSIONS.PRODUCTION_VIEW)

  const [pipelinesResult, usageResult] = await Promise.all([
    getProductionPipelines(),
    getProductionUsage(),
  ])

  const pipelines = pipelinesResult.data
  const runs = pipelines.flatMap((pipeline) => pipeline.runs)
  const inProgress = runs.filter((run) => run.status === "in_progress")

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Production usage"
        description="Ordered pipelines, connected stages and quantity flow from raw input to finished goods."
        icon={Factory}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Pipelines"
          value={pipelines.length}
          hint={`${pipelines.reduce((sum, pipeline) => sum + pipeline.stages.length, 0)} stages`}
          icon={Factory}
          accent="primary"
        />
        <MetricCard
          label="Runs in progress"
          value={inProgress.length}
          hint={`${runs.length} total runs`}
          icon={Play}
          accent="amber"
        />
        <MetricCard
          label="Usage entries"
          value={usageResult.data.length}
          hint="Recorded stage quantities"
          icon={FlaskConical}
          accent="emerald"
        />
      </div>

      <ProductionManager pipelines={pipelines} usage={usageResult.data} />
    </div>
  )
}
