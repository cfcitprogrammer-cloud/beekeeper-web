import Link from "next/link"
import { ArrowLeft, MapPin, Pencil } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import type { WorkspaceLocation } from "@/types/database"

export function WorkspaceLocationDetail({ location, workspaceName }: { location: WorkspaceLocation; workspaceName?: string | null }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/attendance/locations" />}><ArrowLeft />Back to locations</Button>
        <Button size="sm" render={<Link href={`/attendance/locations/${location.id}/edit`} />}><Pencil />Edit location</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="size-5" /></span>
          <div><h2 className="text-lg font-semibold">{location.name}</h2><p className="text-sm text-muted-foreground">{workspaceName ?? "—"}</p><div className="mt-2"><StatusBadge status={location.is_active ? "ACTIVE" : "INACTIVE"} /></div></div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Latitude</p><p className="text-sm tabular-nums">{location.latitude}</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Longitude</p><p className="text-sm tabular-nums">{location.longitude}</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Radius</p><p className="text-sm">{location.radius_m}m</p></div>
        </div>
      </div>
    </div>
  )
}
