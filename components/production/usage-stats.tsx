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
  // Cancellations are kept visible in the usage tables, but they no longer
  // count towards production metrics.
  const activeUsage = usage.filter((line) => line.status !== "cancelled")
  const cancelledCount = usage.length - activeUsage.length
  const batches = groupProductionUsage(activeUsage)
  const skuIds = new Set(
    activeUsage
      .map((line) => line.sku_id)
      .filter((id): id is string => Boolean(id))
  )
  const stageIds = new Set(activeUsage.map((line) => line.stage_id))
  const latestDate = activeUsage.reduce<string | null>(
    (latest, line) =>
      !latest || line.usage_date > latest ? line.usage_date : latest,
    null
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Submissions"
        value={batches.length}
        hint={`${activeUsage.length} active SKU line${
          activeUsage.length === 1 ? "" : "s"
        }${
          cancelledCount > 0
            ? ` · ${cancelledCount} cancellation${cancelledCount === 1 ? "" : "s"}`
            : ""
        }`}
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
