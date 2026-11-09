"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, Eye, Pencil, Plus, Trash2 } from "lucide-react"

import { deleteEmployeeSchedule } from "@/actions/employee-schedule.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { EmployeeSchedule, EmployeeWithRelations, Shift } from "@/types/database"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function EmployeeSchedulesManager({ schedules, employees, shifts }: { schedules: EmployeeSchedule[]; employees: EmployeeWithRelations[]; shifts: Shift[] }) {
  const router = useRouter()
  const empById = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const shiftById = React.useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts])

  async function deleteHandler(id: string) {
    if (!window.confirm("Delete this schedule? This cannot be undone.")) return
    const result = await deleteEmployeeSchedule(id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete schedule", description: result.error }); return }
    toast.add({ type: "success", title: "Schedule deleted", description: "Removed." })
    router.refresh()
  }

  const columns: DataTableColumn<EmployeeSchedule>[] = [
    { id: "employee", header: "Employee", sortValue: (row) => empById.get(row.employee_id)?.last_name ?? "", cell: (row) => { const e = empById.get(row.employee_id); return <span className="text-xs font-medium">{e ? `${e.first_name} ${e.last_name}` : row.employee_id}</span> } },
    { id: "shift", header: "Shift", sortValue: (row) => shiftById.get(row.shift_id)?.name ?? "", cell: (row) => <span className="text-xs">{shiftById.get(row.shift_id)?.name ?? row.shift_id}</span> },
    { id: "days", header: "Days", cell: (row) => <span className="text-xs tabular-nums">{row.days_of_week.map((d) => DAY_LABELS[d]).join(", ")}</span> },
    { id: "effective", header: "Effective", hideBelow: "md", sortValue: (row) => row.effective_from, cell: (row) => <span className="text-xs text-muted-foreground">{row.effective_from} → {row.effective_to ?? "ongoing"}</span> },
    { id: "actions", header: "Actions", align: "right", cell: (row) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="View schedule" render={<Link href={`/shifts/schedules/${row.id}`} />}><Eye className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Edit schedule" render={<Link href={`/shifts/schedules/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); void deleteHandler(row.id) }} aria-label="Delete schedule"><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
    )},
  ]

  return <DataTable data={schedules} columns={columns} getRowId={(row) => row.id} searchable={(row) => { const e = empById.get(row.employee_id); const s = shiftById.get(row.shift_id); return [e?.first_name, e?.last_name, s?.name].filter(Boolean).join(" ") }} searchPlaceholder="Search schedules…" initialSort={{ id: "effective", desc: true }} pageSize={10} emptyTitle="No schedules found" emptyDescription="Create a schedule to get started." emptyIcon={CalendarClock} onRowClick={(row) => router.push(`/shifts/schedules/${row.id}`)} toolbar={<Button size="sm" render={<Link href="/shifts/schedules/new" />}><Plus />New schedule</Button>} />
}
