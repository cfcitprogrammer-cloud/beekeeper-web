"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarPlus,
  CheckCircle2,
  LogIn,
  LogOut,
  MapPinned,
  XCircle,
} from "lucide-react"

import { cancelVisit } from "@/actions/visit.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  VisitCheckDialog,
  type VisitCheckMode,
} from "@/components/visits/visit-check-dialog"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatDate, formatDateTime, formatTimeRange, humanize } from "@/lib/format"
import { VISIT_STATUSES } from "@/types/database"
import type { VisitWithRelations } from "@/lib/data/operations"

export function VisitLog({ visits = [] }: { visits: VisitWithRelations[] }) {
  const router = useRouter()
  const [status, setStatus] = React.useState("all")
  const [classification, setClassification] = React.useState("all")
  const [dialog, setDialog] = React.useState<{
    visit: VisitWithRelations
    mode: VisitCheckMode
  } | null>(null)

  const filtered = React.useMemo(() => {
    return visits.filter((visit) => {
      if (status !== "all" && visit.status.toLowerCase() !== status) return false
      if (classification === "planned" && !visit.is_planned) return false
      if (classification === "unplanned" && visit.is_planned) return false
      return true
    })
  }, [visits, status, classification])

  async function cancel(visit: VisitWithRelations) {
    if (!window.confirm("Cancel this visit?")) return
    const result = await cancelVisit(visit.id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not cancel visit",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Visit cancelled" })
    router.refresh()
  }

  const columns: DataTableColumn<VisitWithRelations>[] = [
    {
      id: "employee",
      header: "Employee",
      sortValue: (row) =>
        row.employee ? `${row.employee.last_name} ${row.employee.first_name}` : "",
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">
            {row.employee
              ? `${row.employee.first_name} ${row.employee.last_name}`
              : "Unknown employee"}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.employee?.employee_no ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "outlet",
      header: "Outlet",
      sortValue: (row) => row.outlet?.name ?? "",
      cell: (row) => (
        <div>
          <p className="text-xs">{row.outlet?.name ?? "Unknown outlet"}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.outlet?.code ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "schedule",
      header: "Schedule",
      sortValue: (row) => `${row.start_date} ${row.start_time ?? ""}`,
      cell: (row) => (
        <div>
          <p className="text-[0.625rem]">
            {formatDate(row.start_date)} → {formatDate(row.end_date)}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.start_time || row.end_time
              ? formatTimeRange(row.start_time, row.end_time)
              : "No set time"}
          </p>
        </div>
      ),
    },
    {
      id: "planned",
      header: "Classification",
      sortValue: (row) => (row.is_planned ? 1 : 0),
      cell: (row) => (
        <span
          className={
            row.is_planned
              ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-emerald-700 dark:text-emerald-300"
              : "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-amber-700 dark:text-amber-300"
          }
        >
          {row.is_planned ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <MapPinned className="size-3" />
          )}
          {row.is_planned ? "Planned" : "Unplanned"}
        </span>
      ),
    },
    {
      id: "checkin",
      header: "Check-in",
      hideBelow: "md",
      sortValue: (row) => row.check_in_at ?? "",
      cell: (row) => (
        <div>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.check_in_at ? formatDateTime(row.check_in_at) : "Not checked in"}
          </p>
          {row.check_in_latitude !== null && row.check_in_longitude !== null ? (
            <p className="text-[0.625rem] text-muted-foreground">
              {row.check_in_latitude}, {row.check_in_longitude}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "checkout",
      header: "Check-out",
      hideBelow: "lg",
      sortValue: (row) => row.check_out_at ?? "",
      cell: (row) => (
        <div>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.check_out_at ? formatDateTime(row.check_out_at) : "Open"}
          </p>
          {row.check_out_latitude !== null && row.check_out_longitude !== null ? (
            <p className="text-[0.625rem] text-muted-foreground">
              {row.check_out_latitude}, {row.check_out_longitude}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {!row.check_in_at &&
          row.status !== "cancelled" &&
          row.status !== "checked_out" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog({ visit: row, mode: "check_in" })}
            >
              <LogIn />
              Check in
            </Button>
          ) : null}
          {row.status === "checked_in" && !row.check_out_at ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog({ visit: row, mode: "check_out" })}
            >
              <LogOut />
              Check out
            </Button>
          ) : null}
          {row.status !== "cancelled" && row.status !== "checked_out" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => cancel(row)}
              aria-label="Cancel visit"
            >
              <XCircle className="size-3.5 text-destructive" />
            </Button>
          ) : null}
        </div>
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
            row.employee?.first_name,
            row.employee?.last_name,
            row.employee?.employee_no,
            row.outlet?.name,
            row.outlet?.code,
            row.is_planned ? "planned" : "unplanned",
            row.start_date,
            row.end_date,
            row.status,
          ]
            .filter(Boolean)
            .join(" ")
        }
        searchPlaceholder="Search visits…"
        initialSort={{ id: "schedule", desc: true }}
        pageSize={10}
        emptyTitle="No visits match your filters"
        emptyDescription="Clear the filters or add a visit to get started."
        emptyIcon={CalendarPlus}
        filters={
          <>
            <NativeSelect
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
              className="w-auto"
            >
              <option value="all">All statuses</option>
              {VISIT_STATUSES.map((value) => {
                const normalized = value.toLowerCase()
                return (
                  <option key={value} value={normalized}>
                    {humanize(value)}
                  </option>
                )
              })}
            </NativeSelect>
            <NativeSelect
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
              aria-label="Filter by classification"
              className="w-auto"
            >
              <option value="all">All classifications</option>
              <option value="planned">Planned</option>
              <option value="unplanned">Unplanned</option>
            </NativeSelect>
          </>
        }
        toolbar={
          <Button size="sm" render={<Link href="/visits/add" />}>
            <CalendarPlus />
            Add visit
          </Button>
        }
      />

      <VisitCheckDialog
        key={dialog ? `${dialog.visit.id}-${dialog.mode}` : "closed"}
        visit={dialog?.visit ?? null}
        mode={dialog?.mode ?? "check_in"}
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        onCompleted={() => {
          setDialog(null)
          router.refresh()
        }}
      />
    </>
  )
}
