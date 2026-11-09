"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Clock3, X } from "lucide-react"

import { decideApproval } from "@/actions/approval.action"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { formatCurrency, formatDateTime, formatRelative, getInitials } from "@/lib/format"
import type { MyPendingApproval } from "@/types/database"

export function ApprovalReviewForm({ approval }: { approval: MyPendingApproval }) {
  const router = useRouter()
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  async function decide(decision: "APPROVED" | "REJECTED") {
    setSaving(true)
    const result = await decideApproval({
      requestStageId: approval.request_stage_id,
      requestId: approval.request_id,
      decision,
      remarks: notes,
      documentType: approval.document_type,
      documentId: approval.document_id,
    })
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not record decision", description: result.error }); return }
    toast.add({ type: decision === "APPROVED" ? "success" : "error", title: decision === "APPROVED" ? "Document approved" : "Document rejected", description: `${approval.document_no} was ${decision.toLowerCase()}.` })
    router.push("/approvals/inbox")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" render={<Link href="/approvals/inbox" />}><ArrowLeft />Back to inbox</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border p-2.5"><p className="text-[0.625rem] text-muted-foreground">Document</p><p className="mt-0.5 font-mono text-xs font-medium">{approval.document_no}</p></div>
          <div className="rounded-md border p-2.5"><p className="text-[0.625rem] text-muted-foreground">Amount</p><p className="mt-0.5 text-xs font-medium">{approval.amount > 0 ? formatCurrency(approval.amount) : "Non-monetary"}</p></div>
          <div className="rounded-md border p-2.5"><p className="text-[0.625rem] text-muted-foreground">Submitted</p><p className="mt-0.5 text-xs font-medium">{formatDateTime(approval.submitted_at)}</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-2.5">
          <Avatar className="size-7"><AvatarFallback className="bg-primary/10 text-[0.5625rem] font-semibold text-primary">{getInitials(approval.requested_by_name)}</AvatarFallback></Avatar>
          <div><p className="text-xs font-medium">{approval.requested_by_name}</p><p className="text-[0.625rem] text-muted-foreground">Requested {formatRelative(approval.submitted_at)} · Stage {approval.stage_sequence}: {approval.stage_name}</p></div>
          <StatusBadge status={approval.status} className="ml-auto" />
        </div>
        {approval.document_type === "BOOKING" ? <Button variant="outline" size="sm" render={<Link href={`/bookings/${approval.document_id}`} />}>Open source document</Button> : null}
        <div className="space-y-1.5">
          <label htmlFor="approval-notes" className="text-xs font-medium">Decision remarks</label>
          <Textarea id="approval-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add context for the requester and downstream approvers…" />
          <p className="flex items-center gap-1 text-[0.625rem] text-muted-foreground"><Clock3 className="size-2.5" />Remarks are stored in the approval audit trail.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" render={<Link href="/approvals/inbox" />} disabled={saving}>Cancel</Button>
          <Button variant="destructive" onClick={() => decide("REJECTED")} disabled={saving}><X />Reject</Button>
          <Button onClick={() => decide("APPROVED")} disabled={saving}><Check />{saving ? "Saving…" : "Approve"}</Button>
        </div>
      </div>
    </div>
  )
}
