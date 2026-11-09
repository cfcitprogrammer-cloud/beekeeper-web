import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ApprovalTemplateForm } from "@/components/approvals/approval-template-form"
import { PageHeader } from "@/components/shared/page-header"

export default async function NewApprovalTemplatePage() {
  await requirePermission(PERMISSIONS.APPROVALS_MANAGE)
  return (<div className="space-y-5"><PageHeader eyebrow="Governance" title="New approval template" description="Create a template, then configure its stages and rules." icon={Plus} /><ApprovalTemplateForm /></div>)
}
