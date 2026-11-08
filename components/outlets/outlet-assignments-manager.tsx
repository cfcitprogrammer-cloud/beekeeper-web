"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MapPinned, Plus, Store, Trash2, Undo2, Users } from "lucide-react"

import {
  assignOutlets,
  reactivateOutletAssignment,
  unassignOutlet,
} from "@/actions/outlet-assignment.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/format"
import type { AssignmentWithRelations } from "@/lib/data/operations"
import type { EmployeeWithRelations, OutletWithRelations } from "@/types/database"

export function OutletAssignmentsManager({
  assignments,
  employees,
  outlets,
}: {
  assignments: AssignmentWithRelations[]
  employees: EmployeeWithRelations[]
  outlets: OutletWithRelations[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [employeeId, setEmployeeId] = React.useState("")
  const [outletIds, setOutletIds] = React.useState<string[]>([])
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const activeEmployees = employees.filter((employee) =>
    ["ACTIVE", "PROBATION", "ON_LEAVE"].includes(employee.status)
  )
  const activeOutlets = outlets.filter((outlet) => outlet.status === "ACTIVE")

  function toggleOutlet(id: string) {
    setOutletIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  async function save() {
    if (!employeeId) {
      toast.add({ type: "error", title: "Select an employee" })
      return
    }
    if (outletIds.length === 0) {
      toast.add({ type: "error", title: "Select at least one outlet" })
      return
    }

    setSaving(true)
    const result = await assignOutlets({ employeeId, outletIds, notes })
    setSaving(false)

    if (!result.success) {
      toast.add({ type: "error", title: "Could not assign outlets", description: result.error })
      return
    }

    toast.add({
      type: "success",
      title: "Outlets assigned",
      description: `${result.data.assigned} assigned, ${result.data.skipped} skipped.`,
    })
    setOpen(false)
    setEmployeeId("")
    setOutletIds([])
    setNotes("")
    router.refresh()
  }

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
    <>
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
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus />
            Assign outlets
          </Button>
        }
      />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Assign outlets"
        description="Select one employee and the outlets they cover. Active assignments are preserved."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              <MapPinned />
              {saving ? "Assigning…" : "Assign outlets"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assignment-employee">Employee</Label>
            <NativeSelect
              id="assignment-employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="w-full"
            >
              <option value="">Select an employee</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} · {employee.employee_no}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Outlets</Label>
              <span className="text-[0.625rem] text-muted-foreground">
                {outletIds.length} selected
              </span>
            </div>
            {activeOutlets.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                No active outlets. Approve an outlet first.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                {activeOutlets.map((outlet) => (
                  <label
                    key={outlet.id}
                    className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-3.5 accent-primary"
                      checked={outletIds.includes(outlet.id)}
                      onChange={() => toggleOutlet(outlet.id)}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-medium">
                        <Store className="size-3 text-muted-foreground" />
                        {outlet.name}
                      </span>
                      <span className="block text-[0.625rem] text-muted-foreground">
                        {outlet.code} · {outlet.address ?? "No address"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assignment-notes">Notes</Label>
            <Input
              id="assignment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Territory or coverage notes"
            />
          </div>

          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-[0.625rem] text-muted-foreground">
            <Users className="size-3.5" />
            Only active employees and approved outlets can be assigned.
          </div>
        </div>
      </Modal>
    </>
  )
}
