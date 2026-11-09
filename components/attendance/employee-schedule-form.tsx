"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createEmployeeSchedule, updateEmployeeSchedule } from "@/actions/employee-schedule.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { EmployeeSchedule, EmployeeWithRelations, Shift } from "@/types/database"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function EmployeeScheduleForm({
  schedule,
  employees,
  shifts,
}: {
  schedule?: EmployeeSchedule | null
  employees: EmployeeWithRelations[]
  shifts: Shift[]
}) {
  const router = useRouter()
  const editingId = schedule?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    employee_id: schedule?.employee_id ?? employees[0]?.id ?? "",
    shift_id: schedule?.shift_id ?? shifts[0]?.id ?? "",
    days: schedule ? [...schedule.days_of_week].sort() : ([] as number[]),
    effective_from: schedule?.effective_from ?? new Date().toISOString().slice(0, 10),
    effective_to: schedule?.effective_to ?? "",
  })

  function toggleDay(day: number) {
    setDraft((d) => ({
      ...d,
      days: d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day].sort((a, b) => a - b),
    }))
  }

  async function saveHandler() {
    if (!draft.employee_id || !draft.shift_id) { toast.add({ type: "error", title: "Missing details", description: "Employee and shift are required." }); return }
    if (!draft.days.length) { toast.add({ type: "error", title: "Missing details", description: "Select at least one day." }); return }
    if (!draft.effective_from) { toast.add({ type: "error", title: "Missing details", description: "Effective from date is required." }); return }
    setSaving(true)
    const payload = { employeeId: draft.employee_id, shiftId: draft.shift_id, daysOfWeek: draft.days, effectiveFrom: draft.effective_from, effectiveTo: draft.effective_to || undefined }
    const result = editingId ? await updateEmployeeSchedule({ ...payload, id: editingId }) : await createEmployeeSchedule(payload)
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: editingId ? "Could not update schedule" : "Could not create schedule", description: result.error }); return }
    toast.add({ type: "success", title: editingId ? "Schedule updated" : "Schedule created", description: "Saved." })
    router.push("/shifts/schedules")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/shifts/schedules")}><ArrowLeft />Back to schedules</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="sch-emp">Employee</Label><NativeSelect id="sch-emp" value={draft.employee_id} onChange={(e) => setDraft({ ...draft, employee_id: e.target.value })} className="w-full">{employees.map((e) => (<option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>))}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="sch-shift">Shift</Label><NativeSelect id="sch-shift" value={draft.shift_id} onChange={(e) => setDraft({ ...draft, shift_id: e.target.value })} className="w-full">{shifts.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}</NativeSelect></div>
          <div className="space-y-1.5"><Label>Days of week</Label><div className="flex flex-wrap gap-1.5">{DAY_LABELS.map((label, idx) => (<Button key={label} type="button" variant={draft.days.includes(idx) ? "default" : "outline"} size="sm" onClick={() => toggleDay(idx)}>{label}</Button>))}</div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="sch-from">Effective from</Label><Input id="sch-from" type="date" value={draft.effective_from} onChange={(e) => setDraft({ ...draft, effective_from: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sch-to">Effective to (optional)</Label><Input id="sch-to" type="date" value={draft.effective_to} onChange={(e) => setDraft({ ...draft, effective_to: e.target.value })} /></div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/shifts/schedules")} disabled={saving}>Cancel</Button>
          <Button onClick={saveHandler} disabled={saving}>{editingId ? <Save /> : <Plus />}{saving ? "Saving…" : editingId ? "Save changes" : "Create"}</Button>
        </div>
      </div>
    </div>
  )
}
