import { CalendarCheck, FlaskConical, Layers, Tags } from "lucide-react"

import { MetricCard } from "@/components/shared/metric-card"
import type { ProductionUsageWithRelations } from "@/lib/data/operations"
import { groupProductionUsage } from "@/lib/production/usage"
import { formatDate } from "@/lib/format"

export function ProductionUsageStats({
  usage,
}: {
  usage: ProductionUsageWithRelations[]
}) {
  const batches = groupProductionUsage(usage)
  const skuIds = new Set(
    usage.map((line) => line.sku_id).filter((id): id is string => Boolean(id))
  )
  const stageIds = new Set(usage.map((line) => line.stage_id))
  const latestDate = usage.reduce<string | null>(
    (latest, line) =>
      !latest || line.usage_date > latest ? line.usage_date : latest,
    null
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Submissions"
        value={batches.length}
        hint={`${usage.length} SKU line${usage.length === 1 ? "" : "s"}`}
        icon={FlaskConical}
        accent="primary"
      />
      <MetricCard
        label="SKUs used"
        value={skuIds.size}
        hint="Distinct SKUs recorded"
        icon={Tags}
        accent="emerald"
      />
      <MetricCard
        label="Stages covered"
        value={stageIds.size}
        hint="Stages with usage"
        icon={Layers}
        accent="amber"
      />
      <MetricCard
        label="Latest usage"
        value={latestDate ? formatDate(latestDate) : "—"}
        hint={latestDate ? "Most recent entry date" : "No usage recorded yet"}
        icon={CalendarCheck}
        accent="primary"
      />
    </div>
  )
}
