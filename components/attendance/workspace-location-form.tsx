"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { createWorkspaceLocation, updateWorkspaceLocation } from "@/actions/workspace-location.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { WorkspaceLocation } from "@/types/database"

export function WorkspaceLocationForm({ location, workspaces }: { location?: WorkspaceLocation | null; workspaces: { id: string; name: string }[] }) {
  const router = useRouter()
  const editingId = location?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: location?.name ?? "",
    workspace_id: location?.workspace_id ?? workspaces[0]?.id ?? "",
    latitude: location ? String(location.latitude) : "",
    longitude: location ? String(location.longitude) : "",
    radius_m: location ? String(location.radius_m) : "150",
  })

  async function saveHandler() {
    if (!draft.name.trim() || !draft.workspace_id) {
      toast.add({ type: "error", title: "Missing details", description: "Name and workspace are required." })
      return
    }
    setSaving(true)
    const payload = { name: draft.name, workspaceId: draft.workspace_id, latitude: Number(draft.latitude) || 0, longitude: Number(draft.longitude) || 0, radiusM: Number(draft.radius_m) || 150 }
    const result = editingId ? await updateWorkspaceLocation({ ...payload, id: editingId }) : await createWorkspaceLocation(payload)
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: editingId ? "Could not update location" : "Could not create location", description: result.error }); return }
    toast.add({ type: "success", title: editingId ? "Location updated" : "Location created", description: `${draft.name.trim()} saved.` })
    router.push("/attendance/locations")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/attendance/locations")}><ArrowLeft />Back to locations</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="loc-name">Name</Label><Input id="loc-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="loc-ws">Workspace</Label><NativeSelect id="loc-ws" value={draft.workspace_id} onChange={(e) => setDraft({ ...draft, workspace_id: e.target.value })}>{workspaces.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}</NativeSelect></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="loc-lat">Latitude</Label><Input id="loc-lat" type="number" step="any" value={draft.latitude} onChange={(e) => setDraft({ ...draft, latitude: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="loc-lng">Longitude</Label><Input id="loc-lng" type="number" step="any" value={draft.longitude} onChange={(e) => setDraft({ ...draft, longitude: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="loc-radius">Radius (m)</Label><Input id="loc-radius" type="number" min={1} value={draft.radius_m} onChange={(e) => setDraft({ ...draft, radius_m: e.target.value })} /></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/attendance/locations")} disabled={saving}>Cancel</Button>
          <Button onClick={saveHandler} disabled={saving}>{editingId ? <Save /> : <Plus />}{saving ? "Saving…" : editingId ? "Save changes" : "Create"}</Button>
        </div>
      </div>
    </div>
  )
}
