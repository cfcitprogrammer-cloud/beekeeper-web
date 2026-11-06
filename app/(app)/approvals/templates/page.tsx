import { GitBranch, Layers, ShieldCheck, Workflow } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ApprovalTemplatesManager } from "@/components/approvals/approval-templates-manager"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getApprovalTemplates } from "@/lib/data/queries"

export default async function ApprovalTemplatesPage() {
  await requirePermission(PERMISSIONS.APPROVALS_MANAGE)

  const result = await getApprovalTemplates()
  const templates = result.data

  const active = templates.filter((template) => template.is_active)
  const documentTypes = new Set(
    templates.map((template) => template.document_type)
  )
  const stageCount = templates.reduce(
    (sum, template) => sum + template.stages.length,
    0
  )
  const averageStages = templates.length
    ? (stageCount / templates.length).toFixed(1)
    : "0"

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="Approval templates"
        description="Design conditional, multi-stage approval workflows for every document type in the workspace."
        icon={Workflow}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Templates"
          value={templates.length}
          hint={`${active.length} active workflows`}
          icon={ShieldCheck}
          accent="primary"
        />
        <MetricCard
          label="Document types"
          value={documentTypes.size}
          hint="Bookings and outlets"
          icon={GitBranch}
          accent="sky"
        />
        <MetricCard
          label="Configured stages"
          value={stageCount}
          hint={`Avg. ${averageStages} per template`}
          icon={Layers}
          accent="violet"
        />
        <MetricCard
          label="Inactive drafts"
          value={templates.length - active.length}
          hint="Not routing documents"
          icon={Workflow}
          accent="amber"
        />
      </div>

      <ApprovalTemplatesManager templates={templates} />
    </div>
  )
}
