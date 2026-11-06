"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, MapPin, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createWorkspaceLocation,
  deleteWorkspaceLocation,
  updateWorkspaceLocation,
} from "@/actions/workspace-location.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { WorkspaceLocation } from "@/types/database"

const emptyDraft = {
  name: "",
  workspace_id: "",
  latitude: "",
  longitude: "",
  radius_m: "150",
}

export function WorkspaceLocationsManager({
  locations,
  workspaces,
}: {
  locations: WorkspaceLocation[]
  workspaces: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState({
    ...emptyDraft,
    workspace_id: workspaces[0]?.id ?? "",
  })
  const [saving, setSaving] = React.useState(false)

  const wsById = React.useMemo(() => new Map(workspaces.map((w) => [w.id, w])), [workspaces])

  async function saveHandler() {
    if (!draft.name.trim() || !draft.workspace_id) {
      toast.add({ type: "error", title: "Missing details", description: "Name and workspace are required." })
      return
    }
    setSaving(true)
    const payload = {
      name: draft.name,
      workspaceId: draft.workspace_id,
      latitude: Number(draft.latitude) || 0,
      longitude: Number(draft.longitude) || 0,
      radiusM: Number(draft.radius_m) || 150,
    }
    const result = editingId
      ? await updateWorkspaceLocation({ ...payload, id: editingId })
      : await createWorkspaceLocation(payload)
    setSaving(false)
    if (!result.success) {
      toast.add({ type: "error", title: editingId ? "Could not update location" : "Could not create location", description: result.error })
      return
    }
    toast.add({ type: "success", title: editingId ? "Location updated" : "Location created", description: `${draft.name.trim()} saved.` })
    setDraft({ ...emptyDraft, workspace_id: workspaces[0]?.id ?? "" })
    setEditingId(null)
    setOpen(false)
    router.refresh()
  }

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete location "${name}"? This cannot be undone.`)) return
    const result = await deleteWorkspaceLocation(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete location", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Location deleted", description: `${name} was removed.` })
    router.refresh()
  }

  function openCreate() {
    setEditingId(null)
    setDraft({ ...emptyDraft, workspace_id: workspaces[0]?.id ?? "" })
    setOpen(true)
  }

  function openEdit(loc: WorkspaceLocation) {
    setEditingId(loc.id)
    setDraft({
      name: loc.name,
      workspace_id: loc.workspace_id,
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      radius_m: String(loc.radius_m),
    })
    setOpen(true)
  }

  const columns: DataTableColumn<WorkspaceLocation>[] = [
    {
      id: "name",
      header: "Location",
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <MapPin className="size-3.5" />
          </span>
          <span className="text-xs font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      id: "workspace",
      header: "Workspace",
      sortValue: (row) => wsById.get(row.workspace_id)?.name ?? "",
      cell: (row) => <span className="text-xs text-muted-foreground">{wsById.get(row.workspace_id)?.name ?? "—"}</span>,
    },
    {
      id: "coords",
      header: "Coordinates",
      hideBelow: "md",
      sortValue: (row) => row.latitude,
      cell: (row) => <span className="text-xs tabular-nums">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</span>,
    },
    {
      id: "radius",
      header: "Radius",
      align: "right",
      sortValue: (row) => row.radius_m,
      cell: (row) => <span className="text-xs tabular-nums">{row.radius_m}m</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => (row.is_active ? 1 : 0),
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit location">
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteHandler(row.id, row.name)} aria-label="Delete location">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={locations}
        columns={columns}
        getRowId={(row) => row.id}
        searchable={(row) => [row.name, wsById.get(row.workspace_id)?.name].filter(Boolean).join(" ")}
        searchPlaceholder="Search locations…"
        initialSort={{ id: "name", desc: false }}
        pageSize={10}
        emptyTitle="No locations found"
        emptyDescription="Create a location to get started."
        emptyIcon={MapPin}
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New location
          </Button>
        }
      />
      <Modal
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) {
            setEditingId(null)
            setDraft({ ...emptyDraft, workspace_id: workspaces[0]?.id ?? "" })
          }
        }}
        title={editingId ? "Edit location" : "New location"}
        description="Define a geofenced attendance location."
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
            <Label htmlFor="loc-name">Name</Label>
            <Input id="loc-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-ws">Workspace</Label>
            <NativeSelect id="loc-ws" value={draft.workspace_id} onChange={(e) => setDraft({ ...draft, workspace_id: e.target.value })}>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="loc-lat">Latitude</Label>
              <Input id="loc-lat" type="number" step="any" value={draft.latitude} onChange={(e) => setDraft({ ...draft, latitude: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-lng">Longitude</Label>
              <Input id="loc-lng" type="number" step="any" value={draft.longitude} onChange={(e) => setDraft({ ...draft, longitude: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-radius">Radius (m)</Label>
            <Input id="loc-radius" type="number" min={1} value={draft.radius_m} onChange={(e) => setDraft({ ...draft, radius_m: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  )
}