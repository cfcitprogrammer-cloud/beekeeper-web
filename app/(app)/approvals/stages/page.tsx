import { ShieldCheck } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getApprovalStages } from "@/lib/data/queries"
import { ApprovalStagesManager } from "@/components/approvals/approval-stages-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function ApprovalStagesPage() {
  await requirePermission(PERMISSIONS.APPROVALS_MANAGE)

  const result = await getApprovalStages()
  const stages = result.data

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Approval stages"
        description="Define reusable approval stages."
        icon={ShieldCheck}
      />
      <ApprovalStagesManager stages={stages} />
    </>
  )
}