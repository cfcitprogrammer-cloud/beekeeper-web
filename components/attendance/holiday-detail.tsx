import Link from "next/link"
import { ArrowLeft, CalendarDays, Pencil } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatDate, humanize } from "@/lib/format"
import type { Holiday } from "@/types/database"

export function HolidayDetail({ holiday, workspaceName }: { holiday: Holiday; workspaceName?: string | null }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/attendance/holidays" />}><ArrowLeft />Back to holidays</Button>
        <Button size="sm" render={<Link href={`/attendance/holidays/${holiday.id}/edit`} />}><Pencil />Edit holiday</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarDays className="size-5" /></span>
          <div><h2 className="text-lg font-semibold">{holiday.name}</h2><p className="text-sm text-muted-foreground">{formatDate(holiday.holiday_date)}</p><div className="mt-2"><StatusBadge status={holiday.type === "REGULAR" ? "ACTIVE" : "PENDING"} label={humanize(holiday.type)} /></div></div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Scope</p><p className="text-sm">{workspaceName ?? "Company-wide"}</p></div>
          <div className="space-y-0.5"><p className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">Created</p><p className="text-sm">{holiday.created_at ? new Date(holiday.created_at).toLocaleString() : "—"}</p></div>
        </div>
      </div>
    </div>
  )
}
