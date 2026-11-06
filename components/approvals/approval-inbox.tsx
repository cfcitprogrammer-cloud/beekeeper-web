"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Check,
  Clock3,
  Package,
  ShoppingCart,
  Store,
  X,
} from "lucide-react"

import { decideApproval } from "@/actions/approval.action"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/native-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  formatCurrency,
  formatDateTime,
  formatRelative,
  getInitials,
} from "@/lib/format"
import type {
  ApprovalDocumentType,
  ApprovalHistoryItem,
  MyPendingApproval,
} from "@/types/database"

const documentIcon: Record<ApprovalDocumentType, typeof Package> = {
  BOOKING: ShoppingCart,
  OUTLET: Store,
}

const documentLabel: Record<ApprovalDocumentType, string> = {
  BOOKING: "Booking",
  OUTLET: "Outlet onboarding",
}

export function ApprovalInbox({
  pending: initialPending,
  history: initialHistory,
}: {
  pending: MyPendingApproval[]
  history: ApprovalHistoryItem[]
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(initialPending)
  const [history, setHistory] = React.useState(initialHistory)
  const [type, setType] = React.useState("all")
  const [selected, setSelected] = React.useState<MyPendingApproval | null>(null)
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const filtered = React.useMemo(
    () =>
      pending.filter((approval) =>
        type === "all" ? true : approval.document_type === type
      ),
    [pending, type]
  )

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!selected) return
    setSaving(true)
    const result = await decideApproval({
      requestStageId: selected.request_stage_id,
      requestId: selected.request_id,
      decision,
      remarks: notes,
      documentType: selected.document_type,
      documentId: selected.document_id,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not record decision",
        description: result.error,
      })
      return
    }

    setPending((current) =>
      current.filter((item) => item.request_stage_id !== selected.request_stage_id)
    )
    setHistory((current) => [
      {
        id: selected.request_id,
        document_no: selected.document_no,
        title: selected.title,
        document_type: selected.document_type,
        amount: selected.amount,
        status: decision,
        submitted_at: selected.submitted_at,
        completed_at: new Date().toISOString(),
        requested_by_name: selected.requested_by_name,
      },
      ...current,
    ])
    toast.add({
      type: decision === "APPROVED" ? "success" : "error",
      title: decision === "APPROVED" ? "Document approved" : "Document rejected",
      description: `${selected.document_no} was ${decision.toLowerCase()} at the ${selected.stage_name} stage.`,
    })
    setSelected(null)
    setNotes("")
    router.refresh()
  }

  return (
    <>
      <Tabs defaultValue="pending" className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[0.5625rem]">
                {pending.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="history">
              History
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[0.5625rem]">
                {history.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <NativeSelect
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by document type"
          >
            <option value="all">All document types</option>
            {Object.entries(documentLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <TabsContent value="pending" className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
                <Check className="size-7 text-emerald-500" />
                <p className="text-sm font-medium">Inbox zero</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  There are no documents waiting for your decision. New requests
                  will appear here as they are routed to your stage.
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((approval) => {
              const Icon = documentIcon[approval.document_type]
              return (
                <Card key={approval.request_stage_id}>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold">{approval.title}</p>
                        <Badge variant="outline" className="text-[0.5625rem]">
                          {documentLabel[approval.document_type]}
                        </Badge>
                      </div>
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.625rem] text-muted-foreground">
                        <span className="font-mono">{approval.document_no}</span>
                        <span>·</span>
                        <span>{approval.requested_by_name}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-2.5" />
                          {formatRelative(approval.submitted_at)}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="secondary" className="text-[0.5625rem]">
                          Stage {approval.stage_sequence}: {approval.stage_name}
                        </Badge>
                        {approval.amount > 0 && (
                          <span className="text-[0.6875rem] font-medium tabular-nums">
                            {formatCurrency(approval.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {approval.document_type === "BOOKING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/bookings/${approval.document_id}`} />}
                        >
                          Open document
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(approval)
                          setNotes("")
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle>Decision history</CardTitle>
              <CardDescription>
                Recently completed approval requests across the workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {history.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No completed approvals yet.
                  </p>
                ) : (
                  history.map((item) => {
                    const Icon = documentIcon[item.document_type]
                    return (
                      <div
                        key={`${item.id}-${item.completed_at}`}
                        className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{item.title}</p>
                          <p className="text-[0.625rem] text-muted-foreground">
                            {item.document_no} · {item.requested_by_name} ·{" "}
                            {formatDateTime(item.completed_at)}
                          </p>
                        </div>
                        {item.amount > 0 && (
                          <span className="hidden text-[0.6875rem] font-medium tabular-nums sm:block">
                            {formatCurrency(item.amount)}
                          </span>
                        )}
                        <StatusBadge status={item.status} />
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        title={selected?.title ?? "Review document"}
        description={
          selected
            ? `${selected.document_no} · ${selected.stage_name}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => decide("REJECTED")} disabled={saving}>
              <X />
              Reject
            </Button>
            <Button onClick={() => decide("APPROVED")} disabled={saving}>
              <Check />
              {saving ? "Saving…" : "Approve"}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border p-2.5">
                <p className="text-[0.625rem] text-muted-foreground">Document</p>
                <p className="mt-0.5 font-mono text-xs font-medium">
                  {selected.document_no}
                </p>
              </div>
              <div className="rounded-md border p-2.5">
                <p className="text-[0.625rem] text-muted-foreground">Amount</p>
                <p className="mt-0.5 text-xs font-medium">
                  {selected.amount > 0 ? formatCurrency(selected.amount) : "Non-monetary"}
                </p>
              </div>
              <div className="rounded-md border p-2.5">
                <p className="text-[0.625rem] text-muted-foreground">Submitted</p>
                <p className="mt-0.5 text-xs font-medium">
                  {formatDateTime(selected.submitted_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border p-2.5">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/10 text-[0.5625rem] font-semibold text-primary">
                  {getInitials(selected.requested_by_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-medium">{selected.requested_by_name}</p>
                <p className="text-[0.625rem] text-muted-foreground">
                  Requested {formatRelative(selected.submitted_at)}
                </p>
              </div>
              <StatusBadge status={selected.status} className="ml-auto" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="approval-notes" className="text-xs font-medium">
                Decision remarks
              </label>
              <Textarea
                id="approval-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add context for the requester and downstream approvers…"
              />
              <p className="text-[0.625rem] text-muted-foreground">
                Remarks are stored in the approval audit trail and shared with the
                requester.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
