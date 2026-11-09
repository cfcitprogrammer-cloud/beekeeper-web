"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, Clock3, Eye, MoonStar, Pencil, Plus, Sunrise, Trash2 } from "lucide-react"

import { deleteShift } from "@/actions/shift.action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { formatTimeRange } from "@/lib/format"
import type { Shift } from "@/types/database"

export function ShiftsConfigurator({ shifts }: { shifts: Shift[] }) {
  const router = useRouter()
  const averageBreak = shifts.length ? Math.round(shifts.reduce((sum, shift) => sum + shift.break_minutes, 0) / shifts.length) : 0
  const overnight = shifts.filter((shift) => shift.is_overnight).length

  async function deleteShiftHandler(id: string, name: string) {
    if (!window.confirm(`Delete shift "${name}"? This cannot be undone.`)) return
    const result = await deleteShift(id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete shift", description: result.error }); return }
    toast.add({ type: "success", title: "Shift deleted", description: `${name} was removed.` })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-semibold">Shift templates</h2>
          <p className="text-[0.6875rem] text-muted-foreground">{shifts.length} templates · {overnight} overnight · {averageBreak}m average break</p>
        </div>
        <Button size="sm" render={<Link href="/shifts/new" />}><Plus />New shift</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shifts.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3"><CardContent className="flex flex-col items-center gap-2 py-12 text-center"><CalendarClock className="size-6 text-muted-foreground" /><p className="text-sm font-medium">No shift templates yet</p><p className="max-w-sm text-xs text-muted-foreground">Create a working pattern to use it in scheduling and attendance.</p></CardContent></Card>
        ) : (
          shifts.map((shift) => {
            const Icon = shift.is_overnight ? MoonStar : shift.start_time < "10:00" ? Sunrise : Clock3
            return (
              <Card key={shift.id} className="gap-0 py-0 cursor-pointer transition-shadow hover:shadow-md" onClick={() => router.push(`/shifts/${shift.id}`)}>
                <CardHeader className="flex-row items-start gap-2 border-b py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-1.5">{shift.name}{shift.is_overnight && <Badge variant="outline" className="text-[0.5625rem]">Overnight</Badge>}</CardTitle>
                    <CardDescription className="mt-0.5 flex items-center gap-1"><Clock3 className="size-2.5" />{formatTimeRange(shift.start_time, shift.end_time)}</CardDescription>
                  </div>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm" aria-label="View shift" render={<Link href={`/shifts/${shift.id}`} />}><Eye className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Edit shift" render={<Link href={`/shifts/${shift.id}/edit`} />}><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteShiftHandler(shift.id, shift.name)} aria-label="Delete shift"><Trash2 className="size-3.5 text-destructive" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 py-3">
                  <div className="rounded-md border bg-muted/20 px-1 py-1.5 text-center"><p className="text-[0.5625rem] text-muted-foreground">Break</p><p className="text-[0.6875rem] font-medium">{shift.break_minutes}m</p></div>
                  <div className="rounded-md border bg-muted/20 px-1 py-1.5 text-center"><p className="text-[0.5625rem] text-muted-foreground">Grace</p><p className="text-[0.6875rem] font-medium">{shift.grace_minutes}m</p></div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </>
  )
}
