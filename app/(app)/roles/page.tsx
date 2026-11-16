import { KeyRound, ShieldCheck, UserCheck, Users } from "lucide-react"

import { RolesManager } from "@/components/roles/roles-manager"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { PERMISSIONS, PERMISSION_CATALOG } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getRoleManagementData } from "@/lib/data/access-control"

export default async function RolesPage() {
  const access = await requirePermission(PERMISSIONS.ROLES_MANAGE)
  const { roles, members, candidates } = await getRoleManagementData()

  const systemRoles = roles.filter((role) => role.isSystem).length
  const customRoles = roles.length - systemRoles

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Roles & permissions"
        description="Create roles, choose the permissions they grant, and assign roles to company members. Only people with the roles.manage permission can open this page."
        icon={KeyRound}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Roles"
          value={roles.length}
          hint={`${systemRoles} system · ${customRoles} custom`}
          icon={ShieldCheck}
          accent="primary"
        />
        <MetricCard
          label="Permissions"
          value={PERMISSION_CATALOG.length}
          hint="Available catalog"
          icon={KeyRound}
          accent="sky"
        />
        <MetricCard
          label="Members with access"
          value={members.length}
          hint="Assigned company roles"
          icon={Users}
          accent="violet"
        />
        <MetricCard
          label="Awaiting access"
          value={candidates.length}
          hint="Employees with a login account"
          icon={UserCheck}
          accent="amber"
        />
      </div>

      <RolesManager
        roles={roles}
        members={members}
        candidates={candidates}
        currentUserId={access.user?.id ?? ""}
      />
    </div>
  )
}
