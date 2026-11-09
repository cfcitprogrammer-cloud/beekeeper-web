import { notFound } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ApprovalStageDetail } from "@/components/approvals/approval-stage-detail"
import { PageHeader } from "@/components/shared/page-header"
import {
  getApprovalStage,
  getApprovalStageApprovers,
  getEmployees,
  getRoles,
} from "@/lib/data/queries"

export default async function ApprovalStageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.APPROVALS_MANAGE)
  const result = await getApprovalStage(id)
  if (!result.data) notFound()

  const [approversResult, employeesResult, rolesResult] = await Promise.all([
    getApprovalStageApprovers(id),
    getEmployees(),
    getRoles(),
  ])

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
        title={result.data.name}
        description="Approval stage details."
        icon={ShieldCheck}
      />
      <ApprovalStageDetail
        stage={result.data}
        approvers={approversResult.data}
        employees={employees}
        roles={roles}
      />
    </div>
  )
}
