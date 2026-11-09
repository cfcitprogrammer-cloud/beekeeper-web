"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPinned, Plus, Trash2, Undo2 } from "lucide-react"

import {
  reactivateOutletAssignment,
  unassignOutlet,
} from "@/actions/outlet-assignment.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/format"
import type { AssignmentWithRelations } from "@/lib/data/operations"
import type { EmployeeWithRelations, OutletWithRelations } from "@/types/database"

export function OutletAssignmentsManager({
  assignments,
}: {
  assignments: AssignmentWithRelations[]
  employees: EmployeeWithRelations[]
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()

  async function unassign(id: string) {
    if (!window.confirm("Remove this outlet assignment?")) return
    const result = await unassignOutlet(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not remove assignment", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Assignment removed" })
    router.refresh()
  }

  async function reactivate(id: string) {
    const result = await reactivateOutletAssignment(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not restore assignment", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Assignment restored" })
    router.refresh()
  }

  const columns: DataTableColumn<AssignmentWithRelations>[] = [
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
            {row.outlet?.code ?? "—"} · {row.outlet?.address ?? "No address"}
          </p>
        </div>
      ),
    },
    {
      id: "assigned",
      header: "Assigned",
      hideBelow: "md",
      sortValue: (row) => row.assigned_at,
      cell: (row) => <span className="text-xs">{formatDate(row.assigned_at)}</span>,
    },
    {
      id: "notes",
      header: "Notes",
      hideBelow: "lg",
      cell: (row) => (
        <span className="line-clamp-2 max-w-56 text-xs text-muted-foreground">
          {row.notes ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {row.is_active ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => unassign(row.id)}
              aria-label="Remove assignment"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => reactivate(row.id)}
              aria-label="Restore assignment"
            >
              <Undo2 className="size-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={assignments}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.employee?.first_name,
          row.employee?.last_name,
          row.employee?.employee_no,
          row.outlet?.name,
          row.outlet?.code,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search employee, outlet or notes…"
      initialSort={{ id: "assigned", desc: true }}
      pageSize={10}
      emptyTitle="No outlet assignments yet"
      emptyDescription="Assign outlets to employees to build coverage."
      emptyIcon={MapPinned}
      toolbar={
        <Button size="sm" render={<Link href="/outlets/assignments/new" />}>
          <Plus />
          Assign outlets
        </Button>
      }
    />
  )
}
