import Link from "next/link"
import { ArrowLeft, BriefcaseBusiness, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Position } from "@/types/database"

export function PositionDetail({ position }: { position: Position }) {
  const range = position.min_salary != null || position.max_salary != null ? `${position.min_salary ?? "—"} – ${position.max_salary ?? "—"}` : "—"
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/employees/positions" />}><ArrowLeft />Back to positions</Button>
        <Button size="sm" render={<Link href={`/employees/positions/${position.id}/edit`} />}><Pencil />Edit position</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BriefcaseBusiness className="size-5" /></span>
          <div><h2 className="text-lg font-semibold">{position.title}</h2><p className="text-sm text-muted-foreground">Salary range: {range}</p></div>
        </div>
        {position.description ? <div className="mt-4"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Description</p><p className="mt-1 text-sm">{position.description}</p></div> : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Created</p><p className="text-sm">{position.created_at ? new Date(position.created_at).toLocaleString() : "—"}</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Updated</p><p className="text-sm">{position.updated_at ? new Date(position.updated_at).toLocaleString() : "—"}</p></div>
        </div>
      </div>
    </div>
  )
}
