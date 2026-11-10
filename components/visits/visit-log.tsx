"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  LogIn,
  LogOut,
  MapPinned,
  XCircle,
} from "lucide-react"

import { cancelVisit, checkOutVisit } from "@/actions/visit.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatDateTime, humanize } from "@/lib/format"
import { VISIT_STATUSES } from "@/types/database"
import type { VisitWithRelations } from "@/lib/data/operations"

export function VisitLog({ visits = [] }: { visits: VisitWithRelations[] }) {
  const router = useRouter()
  const [status, setStatus] = React.useState("all")
  const [classification, setClassification] = React.useState("all")

  const filtered = React.useMemo(() => {
    return visits.filter((visit) => {
      if (status !== "all" && visit.status.toLowerCase() !== status) return false
      if (classification === "planned" && !visit.is_planned) return false
      if (classification === "unplanned" && visit.is_planned) return false
      return true
    })
  }, [visits, status, classification])

  async function checkout(visit: VisitWithRelations) {
    const result = await checkOutVisit({ visitId: visit.id })
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not check out",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Visit checked out" })
    router.refresh()
  }

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
      sortValue: (row) => row.check_in_at,
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {formatDateTime(row.check_in_at)}
        </span>
      ),
    },
    {
      id: "checkout",
      header: "Check-out",
      hideBelow: "lg",
      sortValue: (row) => row.check_out_at ?? "",
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {row.check_out_at ? formatDateTime(row.check_out_at) : "Open"}
        </span>
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
          {!row.check_out_at && row.status === "checked_in" ? (
            <Button variant="outline" size="sm" onClick={() => checkout(row)}>
              <LogOut />
              Check out
            </Button>
          ) : null}
          {row.status !== "cancelled" ? (
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
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search visits…"
      initialSort={{ id: "checkin", desc: true }}
      pageSize={10}
      emptyTitle="No visits match your filters"
      emptyDescription="Clear the filters or check in to an outlet."
      emptyIcon={LogIn}
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
        <Button size="sm" render={<Link href="/visits/check-in" />}>
          <LogIn />
          Check in
        </Button>
      }
    />
  )
}
