import { notFound } from "next/navigation"

import { ShieldCheck } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import {
  getApprovalStages,
  getApprovalTemplates,
  getEmployees,
  getRoles,
} from "@/lib/data/queries"
import { ApprovalTemplateConfigManager } from "@/components/approvals/approval-template-config-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function ApprovalTemplateConfigPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission(PERMISSIONS.APPROVALS_MANAGE)

  const { id } = await params

  const [templatesResult, stagesResult, employeesResult, rolesResult] = await Promise.all([
    getApprovalTemplates(),
    getApprovalStages(),
    getEmployees(),
    getRoles(),
  ])

  const template = templatesResult.data.find((t) => t.id === id)
  if (!template) notFound()

  const employees = employeesResult.data.flatMap((employee) =>
    employee.user_id
      ? [{ id: employee.user_id, name: `${employee.first_name} ${employee.last_name}`.trim() }]
      : []
  )

  const roles = rolesResult.data.map((r) => ({ id: r.id, name: r.name }))

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title={`Configure: ${template.name}`}
        description="Manage stages, approvers, conditions and originators for this template."
        icon={ShieldCheck}
      />
      <ApprovalTemplateConfigManager
        template={template}
        stages={stagesResult.data}
        employees={employees}
        roles={roles}
      />
    </>
  )
}