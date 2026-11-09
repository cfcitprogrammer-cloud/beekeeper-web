"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createPosition, updatePosition } from "@/actions/position.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { Position } from "@/types/database"

export function PositionForm({ position }: { position?: Position | null }) {
  const router = useRouter()
  const editingId = position?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    title: position?.title ?? "",
    description: position?.description ?? "",
    min_salary: position?.min_salary != null ? String(position.min_salary) : "",
    max_salary: position?.max_salary != null ? String(position.max_salary) : "",
  })

  async function saveHandler() {
    if (!draft.title.trim()) {
      toast.add({ type: "error", title: "Missing details", description: "Title is required." })
      return
    }
    setSaving(true)
    const payload = {
      title: draft.title,
      description: draft.description,
      minSalary: draft.min_salary ? Number(draft.min_salary) : undefined,
      maxSalary: draft.max_salary ? Number(draft.max_salary) : undefined,
    }
    const result = editingId ? await updatePosition({ ...payload, id: editingId }) : await createPosition(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update position" : "Could not create position", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Position updated" : "Position created", description: `${draft.title.trim()} saved.` })
    router.push("/employees/positions")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/employees/positions")}><ArrowLeft />Back to positions</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="pos-title">Title</Label><Input id="pos-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="pos-desc">Description</Label><Textarea id="pos-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="pos-min">Min salary</Label><Input id="pos-min" type="number" min={0} value={draft.min_salary} onChange={(e) => setDraft({ ...draft, min_salary: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="pos-max">Max salary</Label><Input id="pos-max" type="number" min={0} value={draft.max_salary} onChange={(e) => setDraft({ ...draft, max_salary: e.target.value })} /></div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/employees/positions")} disabled={saving}>Cancel</Button>
          <Button onClick={saveHandler} disabled={saving}>{editingId ? <Save /> : <Plus />}{saving ? "Saving…" : editingId ? "Save changes" : "Create"}</Button>
        </div>
      </div>
    </div>
  )
}
