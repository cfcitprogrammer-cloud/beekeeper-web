"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, CheckCircle2, Eye, LogIn, LogOut, MapPinned, Pencil, Plus, Target, Trash2, XCircle } from "lucide-react"

import { cancelVisit, checkOutVisit, deleteVisitPlan } from "@/actions/visit.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { formatDateTime } from "@/lib/format"
import type { VisitPlanWithRelations, VisitWithRelations } from "@/lib/data/operations"
import type { EmployeeWithRelations, OutletWithRelations } from "@/types/database"

export function VisitsManager({
  plans,
  visits,
}: {
  plans: VisitPlanWithRelations[]
  visits: VisitWithRelations[]
  employees: EmployeeWithRelations[]
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()

  async function removePlan(plan: VisitPlanWithRelations) {
    if (!window.confirm(`Delete visit plan "${plan.name}"?`)) return
    const result = await deleteVisitPlan(plan.id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete plan", description: result.error }); return }
    toast.add({ type: "success", title: "Visit plan deleted" })
    router.refresh()
  }

  async function checkout(visit: VisitWithRelations) {
    const result = await checkOutVisit({ visitId: visit.id })
    if (!result.success) { toast.add({ type: "error", title: "Could not check out", description: result.error }); return }
    toast.add({ type: "success", title: "Visit checked out" })
    router.refresh()
  }

  async function cancel(visit: VisitWithRelations) {
    if (!window.confirm("Cancel this visit?")) return
    const result = await cancelVisit(visit.id)
    if (!result.success) { toast.add({ type: "error", title: "Could not cancel visit", description: result.error }); return }
    toast.add({ type: "success", title: "Visit cancelled" })
    router.refresh()
  }

  const planColumns: DataTableColumn<VisitPlanWithRelations>[] = [
    { id: "plan", header: "Visit plan", sortValue: (row) => row.name, cell: (row) => (<div><p className="text-xs font-medium">{row.name}</p><p className="text-[0.625rem] text-muted-foreground">{row.employee ? `${row.employee.first_name} ${row.employee.last_name} · ${row.employee.employee_no}` : "Unknown employee"}</p></div>) },
    { id: "range", header: "Date range", hideBelow: "md", sortValue: (row) => row.start_date, cell: (row) => <span className="text-xs">{row.start_date} → {row.end_date}</span> },
    { id: "targets", header: "Targets", align: "right", sortValue: (row) => row.targets.length, cell: (row) => <span className="text-xs tabular-nums">{row.targets.length}</span> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { id: "actions", header: "", align: "right", cell: (row) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="View plan" render={<Link href={`/visits/plans/${row.id}`} />}><Eye className="size-3.5" /></Button>
        <Button variant="outline" size="sm" render={<Link href={`/visits/plans/${row.id}`} />}><Target />Targets</Button>
        <Button variant="ghost" size="icon-sm" aria-label="Edit visit plan" render={<Link href={`/visits/plans/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => removePlan(row)} aria-label="Delete visit plan"><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
    )},
  ]

  const visitColumns: DataTableColumn<VisitWithRelations>[] = [
    { id: "employee", header: "Employee", sortValue: (row) => row.employee ? `${row.employee.last_name} ${row.employee.first_name}` : "", cell: (row) => (<div><p className="text-xs font-medium">{row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : "Unknown employee"}</p><p className="text-[0.625rem] text-muted-foreground">{row.employee?.employee_no ?? "—"}</p></div>) },
    { id: "outlet", header: "Outlet", sortValue: (row) => row.outlet?.name ?? "", cell: (row) => (<div><p className="text-xs">{row.outlet?.name ?? "Unknown outlet"}</p><p className="text-[0.625rem] text-muted-foreground">{row.outlet?.code ?? "—"}</p></div>) },
    { id: "planned", header: "Classification", sortValue: (row) => (row.is_planned ? 1 : 0), cell: (row) => (<span className={row.is_planned ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-emerald-700 dark:text-emerald-300" : "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-amber-700 dark:text-amber-300"}>{row.is_planned ? <CheckCircle2 className="size-3" /> : <MapPinned className="size-3" />}{row.is_planned ? "Planned" : "Unplanned"}</span>) },
    { id: "checkin", header: "Check-in", hideBelow: "md", sortValue: (row) => row.check_in_at, cell: (row) => <span className="text-[0.625rem] text-muted-foreground">{formatDateTime(row.check_in_at)}</span> },
    { id: "checkout", header: "Check-out", hideBelow: "lg", sortValue: (row) => row.check_out_at ?? "", cell: (row) => <span className="text-[0.625rem] text-muted-foreground">{row.check_out_at ? formatDateTime(row.check_out_at) : "Open"}</span> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { id: "actions", header: "", align: "right", cell: (row) => (
      <div className="flex justify-end gap-1">
        {!row.check_out_at && row.status === "checked_in" && <Button variant="outline" size="sm" onClick={() => checkout(row)}><LogOut />Check out</Button>}
        {row.status !== "cancelled" && <Button variant="ghost" size="icon-sm" onClick={() => cancel(row)} aria-label="Cancel visit"><XCircle className="size-3.5 text-destructive" /></Button>}
      </div>
    )},
  ]

  return (
    <>
      <DataTable data={plans} columns={planColumns} getRowId={(row) => row.id} searchable={(row) => [row.name, row.employee?.first_name, row.employee?.last_name, row.employee?.employee_no].filter(Boolean).join(" ")} searchPlaceholder="Search visit plans…" pageSize={8} emptyTitle="No visit plans yet" emptyDescription="Create a plan with target outlets; visits outside it are unplanned." emptyIcon={CalendarClock} onRowClick={(row) => router.push(`/visits/plans/${row.id}`)} toolbar={<><Button variant="outline" size="sm" render={<Link href="/visits/check-in" />}><LogIn />Check in</Button><Button size="sm" render={<Link href="/visits/plans/new" />}><Plus />New visit plan</Button></>} />
      <div className="mt-5 rounded-xl border bg-card">
        <div className="border-b px-4 py-3"><p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">Visit log</p><p className="font-heading text-sm font-semibold">{visits.length} visits · {visits.filter((visit) => !visit.is_planned).length} unplanned</p></div>
        <div className="p-3"><DataTable data={visits} columns={visitColumns} getRowId={(row) => row.id} searchable={(row) => [row.employee?.first_name, row.employee?.last_name, row.employee?.employee_no, row.outlet?.name, row.outlet?.code, row.is_planned ? "planned" : "unplanned"].filter(Boolean).join(" ")} searchPlaceholder="Search visits…" pageSize={10} emptyTitle="No visits recorded" emptyDescription="Check in to an outlet to create the first visit." emptyIcon={LogIn} /></div>
      </div>
    </>
  )
}
