"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createHoliday, updateHoliday } from "@/actions/holiday.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { Holiday } from "@/types/database"

export function HolidayForm({ holiday, workspaces }: { holiday?: Holiday | null; workspaces: { id: string; name: string }[] }) {
  const router = useRouter()
  const editingId = holiday?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: holiday?.name ?? "",
    holiday_date: holiday?.holiday_date ?? new Date().toISOString().slice(0, 10),
    type: (holiday?.type ?? "REGULAR") as Holiday["type"],
    workspace_id: holiday?.workspace_id ?? "",
  })

  async function saveHandler() {
    if (!draft.name.trim() || !draft.holiday_date) {
      toast.add({ type: "error", title: "Missing details", description: "Name and date are required." })
      return
    }
    setSaving(true)
    const payload = { name: draft.name, holidayDate: draft.holiday_date, type: draft.type, workspaceId: draft.workspace_id || undefined }
    const result = editingId ? await updateHoliday({ ...payload, id: editingId }) : await createHoliday(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update holiday" : "Could not create holiday", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Holiday updated" : "Holiday created", description: `${draft.name.trim()} saved.` })
    router.push("/attendance/holidays")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/attendance/holidays")}><ArrowLeft />Back to holidays</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="hol-name">Name</Label><Input id="hol-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="hol-date">Date</Label><Input id="hol-date" type="date" value={draft.holiday_date} onChange={(e) => setDraft({ ...draft, holiday_date: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="hol-type">Type</Label><NativeSelect id="hol-type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Holiday["type"] })}><option value="REGULAR">Regular</option><option value="SPECIAL">Special</option><option value="LOCAL">Company</option></NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="hol-ws">Workspace (optional)</Label><NativeSelect id="hol-ws" value={draft.workspace_id} onChange={(e) => setDraft({ ...draft, workspace_id: e.target.value })}><option value="">Company-wide</option>{workspaces.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}</NativeSelect></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/attendance/holidays")} disabled={saving}>Cancel</Button>
          <Button onClick={saveHandler} disabled={saving}>{editingId ? <Save /> : <Plus />}{saving ? "Saving…" : editingId ? "Save changes" : "Create"}</Button>
        </div>
      </div>
    </div>
  )
}
