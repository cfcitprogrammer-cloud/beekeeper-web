import { ClipboardList } from "lucide-react"

import { ProductionAuditReport } from "@/components/production/audit-report"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getProductionPipelines,
  getProductionStages,
  getProductionUsage,
} from "@/lib/data/operations"

export default async function ProductionAuditPage() {
  await requirePermission(PERMISSIONS.PRODUCTION_VIEW)

  const [pipelinesResult, stagesResult, usageResult] = await Promise.all([
    getProductionPipelines(),
    getProductionStages(),
    getProductionUsage(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Audit report"
        description="Filter SKU-level production usage by pipeline, stage and SKU, then review the matching usage lines."
        icon={ClipboardList}
      />

      <ProductionAuditReport
        pipelines={pipelinesResult.data}
        stages={stagesResult.data}
        usage={usageResult.data}
      />
    </div>
  )
}
