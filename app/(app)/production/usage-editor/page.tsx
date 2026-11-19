import { Table2 } from "lucide-react"

import { ProductionUsageEditorGrid } from "@/components/production/usage-editor-grid"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getProductionPipelines,
  getProductionStages,
  getProductionUsage,
  getProductionUsageSettings,
} from "@/lib/data/operations"
import { toUsageSettings } from "@/lib/production/usage-status"

export default async function ProductionUsageEditorPage() {
  const [access, pipelinesResult, stagesResult, usageResult, settingsResult] =
    await Promise.all([
      requirePermission(PERMISSIONS.PRODUCTION_EDITOR),
      getProductionPipelines(),
      getProductionStages(),
      getProductionUsage(),
      getProductionUsageSettings(),
    ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Usage editor"
        description="Review recorded usage in a spreadsheet-style grid, correct any line, mark cancellations, or apply a mass import update."
        icon={Table2}
      />
      <ProductionUsageEditorGrid
        pipelines={pipelinesResult.data}
        stages={stagesResult.data}
        usage={usageResult.data}
        settings={toUsageSettings(
          settingsResult.data,
          access.company?.timezone
        )}
        currentUserId={access.user?.id ?? null}
        now={new Date().toISOString()}
      />
    </div>
  )
}
