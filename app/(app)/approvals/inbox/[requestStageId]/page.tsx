import { notFound } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ApprovalReviewForm } from "@/components/approvals/approval-review-form"
import { PageHeader } from "@/components/shared/page-header"
import { getPendingApproval } from "@/lib/data/queries"

export default async function ApprovalReviewPage({ params }: { params: Promise<{ requestStageId: string }> }) {
  const { requestStageId } = await params
  await requirePermission(PERMISSIONS.APPROVALS_DECIDE)
  const result = await getPendingApproval(requestStageId)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Governance" title="Review approval" description={`${result.data.document_no} · ${result.data.stage_name}`} icon={ShieldCheck} /><ApprovalReviewForm approval={result.data} /></div>)
}
