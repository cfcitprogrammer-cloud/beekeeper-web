import { Settings2 } from "lucide-react"

import { UsageSettingsForm } from "@/components/production/usage-settings-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionUsageSettings } from "@/lib/data/operations"
import { toUsageSettings } from "@/lib/production/usage-status"

export default async function ProductionUsageSettingsPage() {
  const [, settingsResult] = await Promise.all([
    requirePermission(PERMISSIONS.PRODUCTION_EDITOR),
    getProductionUsageSettings(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Usage settings"
        description="Control the cutoff window, submitter edits, cancellations and duplicate submissions for production usage."
        icon={Settings2}
      />
      <UsageSettingsForm settings={toUsageSettings(settingsResult.data)} />
    </div>
  )
}
