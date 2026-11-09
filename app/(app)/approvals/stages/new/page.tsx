import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ApprovalStageForm } from "@/components/approvals/approval-stage-form"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployees, getRoles } from "@/lib/data/queries"

export default async function NewApprovalStagePage() {
  await requirePermission(PERMISSIONS.APPROVALS_MANAGE)

  const [employeesResult, rolesResult] = await Promise.all([getEmployees(), getRoles()])

  const employees = employeesResult.data.flatMap((employee) =>
    employee.user_id
      ? [{ id: employee.user_id, name: `${employee.first_name} ${employee.last_name}`.trim() }]
      : []
  )

  const roles = rolesResult.data.map((role) => ({ id: role.id, name: role.name }))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="New approval stage"
        description="Create a reusable approval stage and assign its approvers."
        icon={Plus}
      />
      <ApprovalStageForm employees={employees} roles={roles} />
    </div>
  )
}
