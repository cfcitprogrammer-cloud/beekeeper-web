import { FlaskConical } from "lucide-react"

import { UsageManager } from "@/components/production/usage-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionUsage } from "@/lib/data/operations"

export default async function ProductionUsagePage() {
  const access = await requirePermission(PERMISSIONS.PRODUCTION_VIEW)

  const usageResult = await getProductionUsage()
  const canRecord = hasAnyPermission(access.permissions, [
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Production usage"
        description="SKU-level usage recorded per pipeline stage, with the user who submitted it."
        icon={FlaskConical}
      />
      <UsageManager usage={usageResult.data} canRecord={canRecord} />
    </div>
  )
}
