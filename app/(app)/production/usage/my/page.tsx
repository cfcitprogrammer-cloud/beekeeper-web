import { redirect } from "next/navigation"
import { FlaskConical } from "lucide-react"

import { ProductionUsageStats } from "@/components/production/usage-stats"
import { UsageManager } from "@/components/production/usage-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionUsage } from "@/lib/data/operations"

export default async function MyProductionUsagePage() {
  const access = await requirePermission(PERMISSIONS.PRODUCTION_VIEW)

  if (!access.user) redirect("/login")

  const usageResult = await getProductionUsage(access.user.id)
  const canRecord = hasAnyPermission(access.permissions, [
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="My production usage"
        description="Production usage you submitted, grouped by stage and SKU."
        icon={FlaskConical}
      />
      <ProductionUsageStats usage={usageResult.data} />
      <UsageManager
        usage={usageResult.data}
        canRecord={canRecord}
        recordHref="/production/usage/new"
      />
    </div>
  )
}
