import { Building2 } from "lucide-react"

import { WorkspacesManager } from "@/components/workspaces/workspaces-manager"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { requireSuperAdmin } from "@/lib/auth/guards"
import { getWorkspaces } from "@/lib/data/queries"

export default async function WorkspacesPage() {
  await requireSuperAdmin()

  const result = await getWorkspaces()
  const workspaces = result.data
  const active = workspaces.filter((workspace) => workspace.is_active)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="System"
        title="Workspaces"
        description="Create and manage workspaces for your company. Super Admin access only."
        icon={Building2}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Workspaces"
          value={workspaces.length}
          hint={`${active.length} active`}
          icon={Building2}
          accent="primary"
        />
      </div>

      <WorkspacesManager workspaces={workspaces} />
    </div>
  )
}
