"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarCheck2, Check, Clock3, Paperclip, X } from "lucide-react"

import { reviewLeaveRequest } from "@/actions/leave.action"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/format"
import type { LeaveRequestWithRelations } from "@/types/database"

export function LeaveReviewForm({ request }: { request: LeaveRequestWithRelations }) {
  const router = useRouter()
  const [notes, setNotes] = React.useState(request.review_notes ?? "")
  const [saving, setSaving] = React.useState(false)
  const canReview = request.status === "PENDING"

  async function decide(decision: "APPROVED" | "REJECTED") {
    setSaving(true)
    const result = await reviewLeaveRequest({ id: request.id, decision, notes })
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not update request", description: result.error }); return }
    toast.add({ type: decision === "APPROVED" ? "success" : "error", title: decision === "APPROVED" ? "Leave approved" : "Leave rejected" })
    router.push("/leave/requests")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" render={<Link href="/leave/requests" />}><ArrowLeft />Back to requests</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border p-2.5"><p className="text-[0.625rem] text-muted-foreground">Leave period</p><p className="mt-0.5 flex items-center gap-1 text-xs font-medium"><CalendarCheck2 className="size-3 text-muted-foreground" />{formatDate(request.start_date)} – {formatDate(request.end_date)} ({request.days_count} day{request.days_count === 1 ? "" : "s"})</p></div>
          <div className="rounded-md border p-2.5"><p className="text-[0.625rem] text-muted-foreground">Current status</p><div className="mt-1"><StatusBadge status={request.status} /></div></div>
        </div>
        <div className="rounded-md border p-2.5"><p className="text-[0.625rem] text-muted-foreground">Employee</p><p className="mt-0.5 text-xs font-medium">{request.employee.first_name} {request.employee.last_name} · {request.employee.employee_no} · {request.leave_type.name}</p></div>
        <div className="rounded-md border p-2.5"><p className="text-[0.625rem] text-muted-foreground">Reason</p><p className="mt-0.5 text-xs/relaxed">{request.reason || "—"}</p></div>
        {request.attachment_url ? <div className="flex items-center gap-1.5 rounded-md border p-2.5 text-xs"><Paperclip className="size-3 text-muted-foreground" />Supporting attachment</div> : null}
        <div className="space-y-1.5">
          <label htmlFor="review-notes" className="text-xs font-medium">Review notes</label>
          <Textarea id="review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add coverage instructions or a rejection reason…" disabled={!canReview} />
          {canReview ? <p className="flex items-center gap-1 text-[0.625rem] text-muted-foreground"><Clock3 className="size-2.5" />Decisions are logged to the approval audit trail.</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" render={<Link href="/leave/requests" />} disabled={saving}>{canReview ? "Cancel" : "Close"}</Button>
          {canReview ? (<><Button variant="destructive" onClick={() => decide("REJECTED")} disabled={saving}><X />Reject</Button><Button onClick={() => decide("APPROVED")} disabled={saving}><Check />{saving ? "Saving…" : "Approve"}</Button></>) : null}
        </div>
      </div>
    </div>
  )
}
