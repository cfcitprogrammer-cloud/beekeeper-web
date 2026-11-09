"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createShift, updateShift } from "@/actions/shift.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import type { Shift } from "@/types/database"

export function ShiftForm({ shift }: { shift?: Shift | null }) {
  const router = useRouter()
  const editingId = shift?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: shift?.name ?? "",
    start_time: shift?.start_time?.slice(0, 5) ?? "09:00",
    end_time: shift?.end_time?.slice(0, 5) ?? "18:00",
    break_minutes: String(shift?.break_minutes ?? 60),
    grace_minutes: String(shift?.grace_minutes ?? 10),
  })

  async function saveHandler() {
    if (!draft.name.trim()) { toast.add({ type: "error", title: "Missing details", description: "Shift name is required." }); return }
    setSaving(true)
    const payload = { name: draft.name, startTime: draft.start_time, endTime: draft.end_time, breakMinutes: Number(draft.break_minutes) || 0, graceMinutes: Number(draft.grace_minutes) || 0 }
    const result = editingId ? await updateShift({ ...payload, id: editingId }) : await createShift(payload)
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: editingId ? "Could not update shift" : "Could not create shift", description: result.error }); return }
    toast.add({ type: "success", title: editingId ? "Shift updated" : "Shift created", description: `${draft.name.trim()} saved.` })
    router.push("/shifts")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/shifts")}><ArrowLeft />Back to shifts</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="shift-name">Shift name</Label><Input id="shift-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Weekend shift" /></div>
          <div className="space-y-1.5"><Label htmlFor="shift-start">Start time</Label><Input id="shift-start" type="time" value={draft.start_time} onChange={(event) => setDraft({ ...draft, start_time: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="shift-end">End time</Label><Input id="shift-end" type="time" value={draft.end_time} onChange={(event) => setDraft({ ...draft, end_time: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="shift-break">Break (minutes)</Label><Input id="shift-break" type="number" min={0} value={draft.break_minutes} onChange={(event) => setDraft({ ...draft, break_minutes: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="shift-grace">Grace period (minutes)</Label><Input id="shift-grace" type="number" min={0} value={draft.grace_minutes} onChange={(event) => setDraft({ ...draft, grace_minutes: event.target.value })} /></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/shifts")} disabled={saving}>Cancel</Button>
          <Button onClick={saveHandler} disabled={saving}>{editingId ? <Save /> : <Plus />}{saving ? "Saving…" : editingId ? "Save changes" : "Create shift"}</Button>
        </div>
      </div>
    </div>
  )
}
