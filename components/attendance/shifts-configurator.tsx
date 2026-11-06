"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Clock3, MoonStar, Plus, Power, Sunrise, Trash2 } from "lucide-react"

import { createShift, deleteShift } from "@/actions/shift.action"
import { Modal } from "@/components/shared/modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { formatTimeRange } from "@/lib/format"
import type { Shift } from "@/types/database"

const emptyDraft = {
  name: "",
  start_time: "09:00",
  end_time: "18:00",
  break_minutes: "60",
  grace_minutes: "10",
}

export function ShiftsConfigurator({ shifts }: { shifts: Shift[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(emptyDraft)
  const [saving, setSaving] = React.useState(false)

  const averageBreak = shifts.length
    ? Math.round(
        shifts.reduce((sum, shift) => sum + shift.break_minutes, 0) / shifts.length
      )
    : 0
  const overnight = shifts.filter((shift) => shift.is_overnight).length

  async function deleteShiftHandler(id: string, name: string) {
    if (!window.confirm(`Delete shift "${name}"? This cannot be undone.`)) return
    const result = await deleteShift(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete shift", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Shift deleted", description: `${name} was removed.` })
    router.refresh()
  }

  async function createShiftHandler() {
    if (!draft.name.trim()) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Shift name is required.",
      })
      return
    }

    setSaving(true)
    const result = await createShift({
      name: draft.name,
      startTime: draft.start_time,
      endTime: draft.end_time,
      breakMinutes: Number(draft.break_minutes) || 0,
      graceMinutes: Number(draft.grace_minutes) || 0,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not create shift",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Shift created",
      description: `${draft.name.trim()} is now available for scheduling.`,
    })
    setOpen(false)
    setDraft(emptyDraft)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-semibold">Shift templates</h2>
          <p className="text-[0.6875rem] text-muted-foreground">
            {shifts.length} templates · {overnight} overnight · {averageBreak}m average break
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus />
          New shift
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shifts.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarClock className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No shift templates yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Create a working pattern to use it in scheduling and attendance.
              </p>
            </CardContent>
          </Card>
        ) : (
          shifts.map((shift) => {
            const isOvernight = shift.is_overnight
            const Icon = isOvernight ? MoonStar : shift.start_time < "10:00" ? Sunrise : Clock3
            return (
              <Card key={shift.id} className="gap-0 py-0">
                <CardHeader className="flex-row items-start gap-2 border-b py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-1.5">
                      {shift.name}
                      {isOvernight && (
                        <Badge variant="outline" className="text-[0.5625rem]">
                          Overnight
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-0.5 flex items-center gap-1">
                      <Clock3 className="size-2.5" />
                      {formatTimeRange(shift.start_time, shift.end_time)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteShiftHandler(shift.id, shift.name)}
                    aria-label="Delete shift"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 py-3">
                  <div className="rounded-md border bg-muted/20 px-1 py-1.5 text-center">
                    <p className="text-[0.5625rem] text-muted-foreground">Break</p>
                    <p className="text-[0.6875rem] font-medium">{shift.break_minutes}m</p>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-1 py-1.5 text-center">
                    <p className="text-[0.5625rem] text-muted-foreground">Grace</p>
                    <p className="text-[0.6875rem] font-medium">{shift.grace_minutes}m</p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create shift template"
        description="Define working hours, break allowance and grace period."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createShiftHandler} disabled={saving}>
              <Power />
              {saving ? "Creating…" : "Create shift"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="shift-name">Shift name</Label>
            <Input
              id="shift-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Weekend shift"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-start">Start time</Label>
            <Input
              id="shift-start"
              type="time"
              value={draft.start_time}
              onChange={(event) => setDraft({ ...draft, start_time: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-end">End time</Label>
            <Input
              id="shift-end"
              type="time"
              value={draft.end_time}
              onChange={(event) => setDraft({ ...draft, end_time: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-break">Break (minutes)</Label>
            <Input
              id="shift-break"
              type="number"
              min={0}
              value={draft.break_minutes}
              onChange={(event) => setDraft({ ...draft, break_minutes: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-grace">Grace period (minutes)</Label>
            <Input
              id="shift-grace"
              type="number"
              min={0}
              value={draft.grace_minutes}
              onChange={(event) => setDraft({ ...draft, grace_minutes: event.target.value })}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
