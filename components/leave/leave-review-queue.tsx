"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Paperclip } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { formatDate, formatRelative, getInitials, humanize } from "@/lib/format"
import type { LeaveRequestWithRelations } from "@/types/database"

export function LeaveReviewQueue({ requests }: { requests: LeaveRequestWithRelations[] }) {
  const router = useRouter()
  const [status, setStatus] = React.useState("all")
  const [type, setType] = React.useState("all")
  const leaveTypes = Array.from(new Map(requests.map((request) => [request.leave_type.id, request.leave_type])).values())
  const filtered = React.useMemo(() => requests.filter((request) => { if (status !== "all" && request.status !== status) return false; if (type !== "all" && request.leave_type_id !== type) return false; return true }), [requests, status, type])

  const columns: DataTableColumn<LeaveRequestWithRelations>[] = [
    { id: "employee", header: "Employee", sortValue: (row) => `${row.employee.last_name} ${row.employee.first_name}`, cell: (row) => (<div className="flex items-center gap-2"><Avatar className="size-7"><AvatarFallback className="bg-primary/10 text-[0.5625rem] font-semibold text-primary">{getInitials(`${row.employee.first_name} ${row.employee.last_name}`)}</AvatarFallback></Avatar><div><Link href={`/leave/requests/${row.id}`} className="text-xs font-medium text-foreground hover:underline">{row.employee.first_name} {row.employee.last_name}</Link><p className="text-[0.625rem] text-muted-foreground">{row.employee.employee_no} · {row.department_name ?? "Unassigned"}</p></div></div>) },
    { id: "type", header: "Leave type", sortValue: (row) => row.leave_type.name, cell: (row) => (<span className="inline-flex items-center gap-1.5 text-xs"><span className="size-2 rounded-full" style={{ backgroundColor: row.leave_type.color }} />{row.leave_type.name}</span>) },
    { id: "dates", header: "Dates", sortValue: (row) => row.start_date, cell: (row) => (<div><p className="text-xs">{formatDate(row.start_date, { month: "short", day: "numeric" })} – {formatDate(row.end_date, { month: "short", day: "numeric", year: "numeric" })}</p><p className="text-[0.625rem] text-muted-foreground">{row.days_count} {row.days_count === 1 ? "day" : "days"}</p></div>) },
    { id: "reason", header: "Reason", hideBelow: "lg", cell: (row) => <span className="line-clamp-1 max-w-64 text-xs text-muted-foreground">{row.reason}</span> },
    { id: "submitted", header: "Submitted", hideBelow: "xl", sortValue: (row) => row.created_at, cell: (row) => <span className="text-[0.6875rem] text-muted-foreground">{formatRelative(row.created_at)}</span> },
    { id: "attachment", header: "Attachment", hideBelow: "xl", cell: (row) => row.attachment_url ? <span className="inline-flex items-center gap-1 text-[0.625rem] text-sky-600 dark:text-sky-400"><Paperclip className="size-2.5" />Attached</span> : <span className="text-[0.625rem] text-muted-foreground">None</span> },
    { id: "status", header: "Status", sortValue: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
    { id: "actions", header: "", align: "right", cell: (row) => <Button variant={row.status === "PENDING" ? "outline" : "ghost"} size="sm" render={<Link href={`/leave/requests/${row.id}`} />}>{row.status === "PENDING" ? "Review" : "Details"}</Button> },
  ]

  return (
    <DataTable data={filtered} columns={columns} getRowId={(row) => row.id} searchable={(row) => [row.employee.first_name, row.employee.last_name, row.employee.employee_no, row.leave_type.name, row.reason, row.department_name].filter(Boolean).join(" ")} searchPlaceholder="Search employee, leave type or reason…" initialSort={{ id: "submitted", desc: false }} pageSize={10} emptyTitle="No leave requests match your filters" emptyDescription="Clear the filters to see the full review queue." emptyIcon={CalendarDays} onRowClick={(row) => router.push(`/leave/requests/${row.id}`)} filters={<><NativeSelect value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((value) => (<option key={value} value={value}>{humanize(value)}</option>))}</NativeSelect><NativeSelect value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by leave type"><option value="all">All leave types</option>{leaveTypes.map((leaveType) => (<option key={leaveType.id} value={leaveType.id}>{leaveType.name}</option>))}</NativeSelect></>} />
  )
}
