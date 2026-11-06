"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createEmployeeSchedule,
  deleteEmployeeSchedule,
  updateEmployeeSchedule,
} from "@/actions/employee-schedule.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { EmployeeSchedule, EmployeeWithRelations, Shift } from "@/types/database"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const emptyDraft = {
  employee_id: "",
  shift_id: "",
  days: [] as number[],
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
}

export function EmployeeSchedulesManager({
  schedules,
  employees,
  shifts,
}: {
  schedules: EmployeeSchedule[]
  employees: EmployeeWithRelations[]
  shifts: Shift[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState({
    ...emptyDraft,
    employee_id: employees[0]?.id ?? "",
    shift_id: shifts[0]?.id ?? "",
  })
  const [saving, setSaving] = React.useState(false)

  const empById = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const shiftById = React.useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts])

  function toggleDay(day: number) {
    setDraft((d) => ({
      ...d,
      days: d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day].sort(),
    }))
  }

  async function saveHandler() {
    if (!draft.employee_id || !draft.shift_id) {
      toast.add({ type: "error", title: "Missing details", description: "Employee and shift are required." })
      return
    }
    if (!draft.days.length) {
      toast.add({ type: "error", title: "Missing details", description: "Select at least one day." })
      return
    }
    if (!draft.effective_from) {
      toast.add({ type: "error", title: "Missing details", description: "Effective from date is required." })
      return
    }
    setSaving(true)
    const payload = {
      employeeId: draft.employee_id,
      shiftId: draft.shift_id,
      daysOfWeek: draft.days,
      effectiveFrom: draft.effective_from,
      effectiveTo: draft.effective_to || undefined,
    }
    const result = editingId
      ? await updateEmployeeSchedule({ ...payload, id: editingId })
      : await createEmployeeSchedule(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update schedule" : "Could not create schedule", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Schedule updated" : "Schedule created", description: "Saved." })
    setDraft({ ...emptyDraft, employee_id: employees[0]?.id ?? "", shift_id: shifts[0]?.id ?? "" })
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

  async function deleteHandler(id: string) {
    if (!window.confirm("Delete this schedule? This cannot be undone.")) return
    const result = await deleteEmployeeSchedule(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete schedule", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Schedule deleted", description: "Removed." })
    router.refresh()
  }

  function openCreate() {
    setEditingId(null)
    setDraft({ ...emptyDraft, employee_id: employees[0]?.id ?? "", shift_id: shifts[0]?.id ?? "" })
    setOpen(true)
  }

  function openEdit(s: EmployeeSchedule) {
    setEditingId(s.id)
    setDraft({
      employee_id: s.employee_id,
      shift_id: s.shift_id,
      days: [...s.days_of_week].sort(),
      effective_from: s.effective_from,
      effective_to: s.effective_to ?? "",
    })
    setOpen(true)
  }

  const columns: DataTableColumn<EmployeeSchedule>[] = [
    {
      id: "employee",
      header: "Employee",
      sortValue: (row) => empById.get(row.employee_id)?.last_name ?? "",
      cell: (row) => {
        const e = empById.get(row.employee_id)
        return <span className="text-xs font-medium">{e ? `${e.first_name} ${e.last_name}` : row.employee_id}</span>
      },
    },
    {
      id: "shift",
      header: "Shift",
      sortValue: (row) => shiftById.get(row.shift_id)?.name ?? "",
      cell: (row) => <span className="text-xs">{shiftById.get(row.shift_id)?.name ?? row.shift_id}</span>,
    },
    {
      id: "days",
      header: "Days",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.days_of_week.map((d) => DAY_LABELS[d]).join(", ")}
        </span>
      ),
    },
    {
      id: "effective",
      header: "Effective",
      hideBelow: "md",
      sortValue: (row) => row.effective_from,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.effective_from} → {row.effective_to ?? "ongoing"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit schedule">
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteHandler(row.id)} aria-label="Delete schedule">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={schedules}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) => {
          const e = empById.get(row.employee_id)
          const s = shiftById.get(row.shift_id)
          return [e?.first_name, e?.last_name, s?.name].filter(Boolean).join(" ")
        }}
        searchPlaceholder="Search schedules…"
        initialSort={{ id: "effective", desc: true }}
        pageSize={10}
        emptyTitle="No schedules found"
        emptyDescription="Create a schedule to get started."
        emptyIcon={CalendarClock}
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New schedule
          </Button>
        }
      />
      <Modal
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) {
            setEditingId(null)
            setDraft({ ...emptyDraft, employee_id: employees[0]?.id ?? "", shift_id: shifts[0]?.id ?? "" })
          }
        }}
        title={editingId ? "Edit schedule" : "New schedule"}
        description="Assign a shift to an employee on selected days."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveHandler} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sch-emp">Employee</Label>
            <NativeSelect id="sch-emp" value={draft.employee_id} onChange={(e) => setDraft({ ...draft, employee_id: e.target.value })}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sch-shift">Shift</Label>
            <NativeSelect id="sch-shift" value={draft.shift_id} onChange={(e) => setDraft({ ...draft, shift_id: e.target.value })}>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Days of week</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, idx) => (
                <Button
                  key={label}
                  type="button"
                  variant={draft.days.includes(idx) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(idx)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sch-from">Effective from</Label>
              <Input id="sch-from" type="date" value={draft.effective_from} onChange={(e) => setDraft({ ...draft, effective_from: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sch-to">Effective to (optional)</Label>
              <Input id="sch-to" type="date" value={draft.effective_to} onChange={(e) => setDraft({ ...draft, effective_to: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}