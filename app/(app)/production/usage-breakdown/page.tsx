import { BarChart3 } from "lucide-react"

import { UsageBreakdownReport } from "@/components/production/usage-breakdown"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getProductionPipelines,
  getProductionUsageBreakdown,
  getProductionUsageSettings,
} from "@/lib/data/operations"
import { toUsageSettings, usageWindow } from "@/lib/production/usage-status"

export default async function ProductionUsageBreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ pipelineId?: string; date?: string }>
}) {
  const [access, params] = await Promise.all([
    requirePermission(PERMISSIONS.PRODUCTION_USAGE_BREAKDOWN),
    searchParams,
  ])

  const [pipelinesResult, settingsResult] = await Promise.all([
    getProductionPipelines(),
    getProductionUsageSettings(),
  ])

  const settings = toUsageSettings(
    settingsResult.data,
    access.company?.timezone
  )
  const defaultDate = usageWindow(settings).start
  const selectedDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : defaultDate
  const selectedPipelineId = params.pipelineId ?? ""

  const breakdown = selectedPipelineId
    ? (
        await getProductionUsageBreakdown(
          selectedPipelineId,
          selectedDate
        )
      ).data
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Usage breakdown"
        description="Pick a pipeline and a usage date to see every stage as a column and the SKUs used under each stage."
        icon={BarChart3}
      />

      <UsageBreakdownReport
        key={`${selectedPipelineId}:${selectedDate}`}
        pipelines={pipelinesResult.data}
        initialPipelineId={selectedPipelineId}
        initialDate={selectedDate}
        breakdown={breakdown}
      />
    </div>
  )
}
