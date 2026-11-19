import { FlaskConical } from "lucide-react"

import { UsageForm } from "@/components/production/usage-form"
import { PageHeader } from "@/components/shared/page-header"
import { requireAnyPermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionPipelines, getProductionStages, getProductionUsageSettings } from "@/lib/data/operations"
import { todayInTimeZone, toUsageSettings } from "@/lib/production/usage-status"

export default async function NewProductionUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ pipelineId?: string }>
}) {
  const access = await requireAnyPermission([
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])

  const { pipelineId } = await searchParams
  const [pipelinesResult, stagesResult, settingsResult] = await Promise.all([
    getProductionPipelines(),
    getProductionStages(),
    getProductionUsageSettings(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Record production usage"
        description="Pick a pipeline and stage, then enter quantities for one or more SKUs assigned to that stage."
        icon={FlaskConical}
      />
      <UsageForm
        key={pipelineId ?? "new"}
        pipelines={pipelinesResult.data}
        stages={stagesResult.data}
        defaultPipelineId={pipelineId}
        defaultDate={todayInTimeZone(access.company?.timezone)}
        settings={toUsageSettings(
          settingsResult.data,
          access.company?.timezone
        )}
      />
    </div>
  )
}
