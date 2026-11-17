import { UserRound } from "lucide-react"

import { AccountSettingsForm } from "@/components/account/account-settings-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"

export default async function AccountSettingsPage() {
  await requirePermission(PERMISSIONS.DASHBOARD_VIEW)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Account settings"
        description="Manage your password and appearance preferences."
        icon={UserRound}
      />
      <AccountSettingsForm />
    </div>
  )
}
