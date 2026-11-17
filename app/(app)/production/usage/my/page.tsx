import { redirect } from "next/navigation"
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

export default async function MyProductionUsagePage() {
  const access = await requirePermission(PERMISSIONS.PRODUCTION_VIEW)

  if (!access.user) redirect("/login")

  const [usageResult, settingsResult] = await Promise.all([
    getProductionUsage(access.user.id),
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
        title="My production usage"
        description="Production usage you submitted, grouped by stage and SKU. Edit before the cutoff when submitter edits are enabled."
        icon={FlaskConical}
      />
      <ProductionUsageStats usage={usageResult.data} />
      <UsageManager
        usage={usageResult.data}
        canRecord={canRecord}
        recordHref="/production/usage/new"
        settings={toUsageSettings(settingsResult.data)}
        currentUserId={access.user?.id ?? null}
        now={new Date().toISOString()}
      />
    </div>
  )
}
