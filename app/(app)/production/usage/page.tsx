import { FlaskConical } from "lucide-react"

import { ProductionUsageStats } from "@/components/production/usage-stats"
import { UsageManager } from "@/components/production/usage-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions"
import {
  getProductionUsage,
  getProductionUsageSettings,
} from "@/lib/data/operations"
import { toUsageSettings } from "@/lib/production/usage-status"

export default async function ProductionUsagePage() {
  const [access, usageResult, settingsResult] = await Promise.all([
    requirePermission(PERMISSIONS.PRODUCTION_VIEW),
    getProductionUsage(),
    getProductionUsageSettings(),
  ])
  const canRecord = hasAnyPermission(access.permissions, [
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="All production usage"
        description="SKU-level usage recorded per pipeline stage, with its lifecycle status and the user who submitted it."
        icon={FlaskConical}
      />
      <ProductionUsageStats usage={usageResult.data} />
      <UsageManager
        usage={usageResult.data}
        canRecord={canRecord}
        settings={toUsageSettings(settingsResult.data)}
        currentUserId={access.user?.id ?? null}
        now={new Date().toISOString()}
      />
    </div>
  )
}
