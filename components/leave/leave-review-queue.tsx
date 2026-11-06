"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarCheck2,
  CalendarDays,
  Check,
  Clock3,
  Paperclip,
  X,
} from "lucide-react"

import { reviewLeaveRequest } from "@/actions/leave.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  formatDate,
  formatRelative,
  getInitials,
  humanize,
} from "@/lib/format"
import type { LeaveRequestWithRelations } from "@/types/database"

export function LeaveReviewQueue({
  requests: initialRequests,
}: {
  requests: LeaveRequestWithRelations[]
}) {
  const router = useRouter()
  const [requests, setRequests] = React.useState(initialRequests)
  const [status, setStatus] = React.useState("all")
  const [type, setType] = React.useState("all")
  const [selected, setSelected] = React.useState<LeaveRequestWithRelations | null>(
    null
  )
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const leaveTypes = Array.from(
    new Map(requests.map((request) => [request.leave_type.id, request.leave_type])).values()
  )

  const filtered = React.useMemo(
    () =>
      requests.filter((request) => {
        if (status !== "all" && request.status !== status) return false
        if (type !== "all" && request.leave_type_id !== type) return false
        return true
      }),
    [requests, status, type]
  )

  function openReview(request: LeaveRequestWithRelations) {
    setSelected(request)
    setNotes(request.review_notes ?? "")
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!selected) return
    setSaving(true)
    const result = await reviewLeaveRequest({
      id: selected.id,
      decision,
      notes,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not update request",
        description: result.error,
      })
      return
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === selected.id
          ? {
              ...request,
              status: decision,
              review_notes: notes.trim() || null,
              reviewed_at: new Date().toISOString(),
            }
          : request
      )
    )
    toast.add({
      type: decision === "APPROVED" ? "success" : "error",
      title: decision === "APPROVED" ? "Leave approved" : "Leave rejected",
      description: `${selected.employee.first_name} ${selected.employee.last_name}'s ${selected.leave_type.name.toLowerCase()} request was ${decision.toLowerCase()}.`,
    })
    setSelected(null)
    setNotes("")
    router.refresh()
  }

  const columns: DataTableColumn<LeaveRequestWithRelations>[] = [
    {
      id: "employee",
      header: "Employee",
      sortValue: (row) => `${row.employee.last_name} ${row.employee.first_name}`,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-[0.5625rem] font-semibold text-primary">
              {getInitials(`${row.employee.first_name} ${row.employee.last_name}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-medium">
              {row.employee.first_name} {row.employee.last_name}
            </p>
            <p className="text-[0.625rem] text-muted-foreground">
              {row.employee.employee_no} · {row.department_name ?? "Unassigned"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "type",
      header: "Leave type",
      sortValue: (row) => row.leave_type.name,
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: row.leave_type.color }}
          />
          {row.leave_type.name}
        </span>
      ),
    },
    {
      id: "dates",
      header: "Dates",
      sortValue: (row) => row.start_date,
      cell: (row) => (
        <div>
          <p className="text-xs">
            {formatDate(row.start_date, { month: "short", day: "numeric" })} –{" "}
            {formatDate(row.end_date, { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.days_count} {row.days_count === 1 ? "day" : "days"}
          </p>
        </div>
      ),
    },
    {
      id: "reason",
      header: "Reason",
      hideBelow: "lg",
      cell: (row) => (
        <span className="line-clamp-1 max-w-64 text-xs text-muted-foreground">
          {row.reason}
        </span>
      ),
    },
    {
      id: "submitted",
      header: "Submitted",
      hideBelow: "xl",
      sortValue: (row) => row.created_at,
      cell: (row) => (
        <span className="text-[0.6875rem] text-muted-foreground">
          {formatRelative(row.created_at)}
        </span>
      ),
    },
    {
      id: "attachment",
      header: "Attachment",
      hideBelow: "xl",
      cell: (row) =>
        row.attachment_url ? (
          <span className="inline-flex items-center gap-1 text-[0.625rem] text-sky-600 dark:text-sky-400">
            <Paperclip className="size-2.5" />
            Attached
          </span>
        ) : (
          <span className="text-[0.625rem] text-muted-foreground">None</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        row.status === "PENDING" ? (
          <Button variant="outline" size="sm" onClick={() => openReview(row)}>
            Review
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => openReview(row)}>
            Details
          </Button>
        ),
    },
  ]

  return (
    <>
      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) =>
          [
            row.employee.first_name,
            row.employee.last_name,
            row.employee.employee_no,
            row.leave_type.name,
            row.reason,
            row.department_name,
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search employee, leave type or reason…"
        initialSort={{ id: "submitted", desc: false }}
        pageSize={10}
        emptyTitle="No leave requests match your filters"
        emptyDescription="Clear the filters to see the full review queue."
        emptyIcon={CalendarDays}
        filters={
          <>
            <NativeSelect
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={type}
              onChange={(event) => setType(event.target.value)}
              aria-label="Filter by leave type"
            >
              <option value="all">All leave types</option>
              {leaveTypes.map((leaveType) => (
                <option key={leaveType.id} value={leaveType.id}>
                  {leaveType.name}
                </option>
              ))}
            </NativeSelect>
          </>
        }
      />

      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        title={selected ? `Review ${selected.leave_type.name.toLowerCase()}` : "Review leave"}
        description={
          selected
            ? `${selected.employee.first_name} ${selected.employee.last_name} · ${selected.days_count} ${selected.days_count === 1 ? "day" : "days"}`
            : undefined
        }
        size="lg"
        footer={
          selected?.status === "PENDING" ? (
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
          ) : (
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          )
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border p-2.5">
                <p className="text-[0.625rem] text-muted-foreground">Leave period</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium">
                  <CalendarCheck2 className="size-3 text-muted-foreground" />
                  {formatDate(selected.start_date)} – {formatDate(selected.end_date)}
                </p>
              </div>
              <div className="rounded-md border p-2.5">
                <p className="text-[0.625rem] text-muted-foreground">Current status</p>
                <div className="mt-1">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
            </div>
            <div className="rounded-md border p-2.5">
              <p className="text-[0.625rem] text-muted-foreground">Reason</p>
              <p className="mt-0.5 text-xs/relaxed">{selected.reason}</p>
            </div>
            {selected.attachment_url && (
              <div className="flex items-center justify-between rounded-md border p-2.5">
                <span className="flex items-center gap-1.5 text-xs">
                  <Paperclip className="size-3 text-muted-foreground" />
                  Supporting attachment
                </span>
                <Button variant="outline" size="sm">
                  View file
                </Button>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="review-notes" className="text-xs font-medium">
                Review notes
              </label>
              <Textarea
                id="review-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add coverage instructions or a rejection reason…"
                disabled={selected.status !== "PENDING"}
              />
              {selected.status === "PENDING" && (
                <p className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                  <Clock3 className="size-2.5" />
                  Decisions are logged to the approval audit trail.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
