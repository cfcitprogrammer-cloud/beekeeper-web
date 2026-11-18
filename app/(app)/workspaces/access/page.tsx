import { Building2, ShieldCheck, Users } from "lucide-react"

import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { WorkspaceAccessManager } from "@/components/workspaces/workspace-access-manager"
import { requireSuperAdmin } from "@/lib/auth/guards"
import { getWorkspaceAccessData } from "@/lib/data/workspace-access"

export default async function WorkspaceAccessPage() {
  const access = await requireSuperAdmin()
  const { workspaces, users } = await getWorkspaceAccessData()

  const superAdmins = users.filter((user) => user.isSuperAdmin).length
  const restricted = users.filter(
    (user) => !user.isSuperAdmin && user.workspaceIds.length > 0
  ).length

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="System"
        title="Workspace access"
        description="Assign which workspaces each user can see and switch to. Super Admin access only."
        icon={ShieldCheck}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Workspaces"
          value={workspaces.length}
          hint="Active in this company"
          icon={Building2}
          accent="primary"
        />
        <MetricCard
          label="Users"
          value={users.length}
          hint={`${superAdmins} Super Admin${superAdmins === 1 ? "" : "s"}`}
          icon={Users}
          accent="violet"
        />
        <MetricCard
          label="Restricted"
          value={restricted}
          hint="Users limited to specific workspaces"
          icon={ShieldCheck}
          accent="amber"
        />
      </div>

      <WorkspaceAccessManager
        workspaces={workspaces}
        users={users}
        currentUserId={access.user?.id ?? ""}
      />
    </div>
  )
}
