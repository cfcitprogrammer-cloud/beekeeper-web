"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, MapPin, Pencil, Plus, Trash2 } from "lucide-react"

import { deleteWorkspaceLocation } from "@/actions/workspace-location.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { WorkspaceLocation } from "@/types/database"

export function WorkspaceLocationsManager({ locations, workspaces }: { locations: WorkspaceLocation[]; workspaces: { id: string; name: string }[] }) {
  const router = useRouter()
  const wsById = React.useMemo(() => new Map(workspaces.map((w) => [w.id, w])), [workspaces])

  async function deleteHandler(id: string, name: string) {
    if (!window.confirm(`Delete location "${name}"? This cannot be undone.`)) return
    const result = await deleteWorkspaceLocation(id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete location", description: result.error }); return }
    toast.add({ type: "success", title: "Location deleted", description: `${name} was removed.` })
    router.refresh()
  }

  const columns: DataTableColumn<WorkspaceLocation>[] = [
    { id: "name", header: "Location", sortValue: (row) => row.name, cell: (row) => (<div className="flex items-center gap-2"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><MapPin className="size-3.5" /></span><span className="text-xs font-medium">{row.name}</span></div>) },
    { id: "workspace", header: "Workspace", sortValue: (row) => wsById.get(row.workspace_id)?.name ?? "", cell: (row) => <span className="text-xs text-muted-foreground">{wsById.get(row.workspace_id)?.name ?? "—"}</span> },
    { id: "coords", header: "Coordinates", hideBelow: "md", sortValue: (row) => row.latitude, cell: (row) => <span className="text-xs tabular-nums">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</span> },
    { id: "radius", header: "Radius", align: "right", sortValue: (row) => row.radius_m, cell: (row) => <span className="text-xs tabular-nums">{row.radius_m}m</span> },
    { id: "status", header: "Status", sortValue: (row) => (row.is_active ? 1 : 0), cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} /> },
    { id: "actions", header: "Actions", align: "right", cell: (row) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="View location" render={<Link href={`/attendance/locations/${row.id}`} />}><Eye className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Edit location" render={<Link href={`/attendance/locations/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); void deleteHandler(row.id, row.name) }} aria-label="Delete location"><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
    )},
  ]

  return <DataTable data={locations} columns={columns} getRowId={(row) => row.id} searchable={(row) => [row.name, wsById.get(row.workspace_id)?.name].filter(Boolean).join(" ")} searchPlaceholder="Search locations…" initialSort={{ id: "name", desc: false }} pageSize={10} emptyTitle="No locations found" emptyDescription="Create a location to get started." emptyIcon={MapPin} onRowClick={(row) => router.push(`/attendance/locations/${row.id}`)} toolbar={<Button size="sm" render={<Link href="/attendance/locations/new" />}><Plus />New location</Button>} />
}
