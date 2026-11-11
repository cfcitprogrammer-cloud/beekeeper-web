"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarPlus } from "lucide-react"

import { createVisit } from "@/actions/visit.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import type { OutletWithRelations } from "@/types/database"

const today = () => new Date().toISOString().slice(0, 10)

export function VisitForm({ outlets = [] }: { outlets: OutletWithRelations[] }) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const activeOutlets = outlets.filter((outlet) => outlet.status === "ACTIVE")
  const [draft, setDraft] = React.useState({
    outletId: "",
    startDate: today(),
    endDate: today(),
    startTime: "",
    endTime: "",
    notes: "",
  })

  function changeStartDate(value: string) {
    setDraft((current) => ({
      ...current,
      startDate: value,
      endDate: current.endDate < value ? value : current.endDate,
    }))
  }

  async function saveVisit() {
    if (!draft.outletId) {
      toast.add({ type: "error", title: "Select an outlet" })
      return
    }
    if (!draft.startDate || !draft.endDate) {
      toast.add({ type: "error", title: "Start and end dates are required" })
      return
    }
    if (draft.endDate < draft.startDate) {
      toast.add({
        type: "error",
        title: "Invalid date range",
        description: "The end date cannot be before the start date.",
      })
      return
    }
    if (
      draft.startDate === draft.endDate &&
      draft.startTime &&
      draft.endTime &&
      draft.endTime < draft.startTime
    ) {
      toast.add({
        type: "error",
        title: "Invalid time range",
        description: "The end time cannot be before the start time.",
      })
      return
    }

    setSaving(true)
    const result = await createVisit({
      outletId: draft.outletId,
      startDate: draft.startDate,
      endDate: draft.endDate,
      startTime: draft.startTime || undefined,
      endTime: draft.endTime || undefined,
      notes: draft.notes,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not add visit",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Visit added",
      description: result.data.is_planned
        ? "The visit was attached to a visit plan."
        : "The visit was added independently. Save a visit plan covering its dates to attach it.",
    })
    router.push("/visits/log")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/visits/log")}
      >
        <ArrowLeft />
        Back to visit log
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 rounded-md border bg-muted/30 p-2 text-[0.625rem] text-muted-foreground">
          The visit is added for the signed-in employee. Check-in and check-out
          happen later from the visit log and each require a camera capture.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="visit-outlet">Outlet</Label>
            <NativeSelect
              id="visit-outlet"
              value={draft.outletId}
              onChange={(event) =>
                setDraft({ ...draft, outletId: event.target.value })
              }
              className="w-full"
            >
              <option value="">Select an outlet</option>
              {activeOutlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} · {outlet.code}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-start-date">Start date</Label>
            <Input
              id="visit-start-date"
              type="date"
              value={draft.startDate}
              onChange={(event) => changeStartDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-end-date">End date</Label>
            <Input
              id="visit-end-date"
              type="date"
              min={draft.startDate}
              value={draft.endDate}
              onChange={(event) =>
                setDraft({ ...draft, endDate: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-start-time">Start time (optional)</Label>
            <Input
              id="visit-start-time"
              type="time"
              value={draft.startTime}
              onChange={(event) =>
                setDraft({ ...draft, startTime: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit-end-time">End time (optional)</Label>
            <Input
              id="visit-end-time"
              type="time"
              value={draft.endTime}
              onChange={(event) =>
                setDraft({ ...draft, endTime: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="visit-notes">Notes</Label>
            <Input
              id="visit-notes"
              value={draft.notes}
              onChange={(event) =>
                setDraft({ ...draft, notes: event.target.value })
              }
              placeholder="Purpose of visit"
            />
          </div>
        </div>

        <p className="mt-3 text-[0.625rem] text-muted-foreground">
          The visit starts with the database default status. New visits stay
          independent; a visit plan only attaches visits that exist when the plan
          is saved.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/visits/log")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={saveVisit} disabled={saving}>
            <CalendarPlus />
            {saving ? "Adding…" : "Add visit"}
          </Button>
        </div>
      </div>
    </div>
  )
}
