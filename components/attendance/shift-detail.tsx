import Link from "next/link"
import { ArrowLeft, Clock3, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatTimeRange } from "@/lib/format"
import type { Shift } from "@/types/database"

export function ShiftDetail({ shift }: { shift: Shift }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/shifts" />}><ArrowLeft />Back to shifts</Button>
        <Button size="sm" render={<Link href={`/shifts/${shift.id}/edit`} />}><Pencil />Edit shift</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock3 className="size-5" /></span>
          <div><h2 className="text-lg font-semibold flex items-center gap-2">{shift.name}{shift.is_overnight && <Badge variant="outline">Overnight</Badge>}</h2><p className="text-sm text-muted-foreground">{formatTimeRange(shift.start_time, shift.end_time)}</p></div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Break</p><p className="text-sm">{shift.break_minutes} minutes</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Grace period</p><p className="text-sm">{shift.grace_minutes} minutes</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Overnight</p><p className="text-sm">{shift.is_overnight ? "Yes" : "No"}</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Created</p><p className="text-sm">{shift.created_at ? new Date(shift.created_at).toLocaleString() : "—"}</p></div>
        </div>
      </div>
    </div>
  )
}
