"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarClock, Save } from "lucide-react"

import { createVisitPlan, updateVisitPlan } from "@/actions/visit.action"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatDate, formatTimeRange, humanize } from "@/lib/format"
import { VISIT_PLAN_STATUSES } from "@/types/database"
import type {
  VisitPlanWithRelations,
  VisitWithRelations,
} from "@/lib/data/operations"

const today = () => new Date().toISOString().slice(0, 10)

export function VisitPlanForm({
  plan,
  visits = [],
  employeeId,
}: {
  plan?: VisitPlanWithRelations | null
  visits?: VisitWithRelations[]
  employeeId?: string
}) {
  const router = useRouter()
  const editingId = plan?.id ?? null
  const ownerId = plan?.employee_id ?? employeeId
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: plan?.name ?? "",
    startDate: plan?.start_date ?? today(),
    endDate: plan?.end_date ?? today(),
    status: (plan?.status ?? "draft").toUpperCase(),
    notes: plan?.notes ?? "",
  })

  const rangeVisits = React.useMemo(() => {
    if (!draft.startDate || !draft.endDate) return []
    if (draft.endDate < draft.startDate) return []
    return visits
      .filter(
        (visit) =>
          (!ownerId || visit.employee_id === ownerId) &&
          visit.status !== "cancelled" &&
          visit.start_date <= draft.endDate &&
          visit.end_date >= draft.startDate
      )
      .sort((a, b) =>
        `${a.start_date} ${a.start_time ?? ""}`.localeCompare(
          `${b.start_date} ${b.start_time ?? ""}`
        )
      )
  }, [visits, ownerId, draft.startDate, draft.endDate])

  function changeStartDate(value: string) {
    setDraft((current) => ({
      ...current,
      startDate: value,
      endDate: current.endDate < value ? value : current.endDate,
    }))
  }

  async function savePlan() {
    if (!draft.name.trim()) {
      toast.add({ type: "error", title: "A plan name is required" })
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

    setSaving(true)
    const result = editingId
      ? await updateVisitPlan({
          id: editingId,
          name: draft.name,
          startDate: draft.startDate,
          endDate: draft.endDate,
          status: draft.status,
          notes: draft.notes,
        })
      : await createVisitPlan({
          name: draft.name,
          startDate: draft.startDate,
          endDate: draft.endDate,
          notes: draft.notes,
        })
    setSaving(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not save visit plan",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: editingId ? "Visit plan updated" : "Visit plan created",
      description:
        rangeVisits.length > 0
          ? `${rangeVisits.length} visit log(s) in this range are attached to the plan.`
          : "No visit logs fall inside this range yet.",
    })
    router.push(`/visits/plans/${editingId ?? result.data.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/visits/plans")}
      >
        <ArrowLeft />
        Back to visit plans
      </Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 rounded-md border bg-muted/30 p-2 text-[0.625rem] text-muted-foreground">
          This plan is assigned to the signed-in employee. No employee selection is
          required.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="visit-plan-name">Plan name</Label>
            <Input
              id="visit-plan-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="North territory week 42"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-plan-start">Start date</Label>
            <Input
              id="visit-plan-start"
              type="date"
              value={draft.startDate}
              onChange={(event) => changeStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-plan-end">End date</Label>
            <Input
              id="visit-plan-end"
              type="date"
              min={draft.startDate}
              value={draft.endDate}
              onChange={(event) =>
                setDraft({ ...draft, endDate: event.target.value })
              }
            />
          </div>
          {editingId ? (
            <div className="space-y-1.5">
              <Label htmlFor="visit-plan-status">Status</Label>
              <NativeSelect
                id="visit-plan-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value })
                }
                className="w-full"
              >
                {VISIT_PLAN_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="visit-plan-notes">Notes</Label>
            <Input
              id="visit-plan-notes"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="Route or coverage notes"
            />
          </div>
        </div>

        <div className="mt-5 rounded-md border">
          <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium">
            <CalendarClock className="size-3.5" />
            Visit logs in this date range
            <span className="ml-auto text-[0.625rem] font-normal text-muted-foreground">
              {rangeVisits.length} visit{rangeVisits.length === 1 ? "" : "s"}
            </span>
          </div>
          {rangeVisits.length > 0 ? (
            <div className="divide-y">
              {rangeVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium">
                      {visit.outlet?.name ?? "Unknown outlet"}
                    </p>
                    <p className="text-[0.625rem] text-muted-foreground">
                      {formatDate(visit.start_date)} → {formatDate(visit.end_date)}
                      {visit.start_time || visit.end_time
                        ? ` · ${formatTimeRange(visit.start_time, visit.end_time)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {visit.plan_id === editingId ? (
                      <span className="text-[0.625rem] text-muted-foreground">
                        Attached
                      </span>
                    ) : null}
                    <StatusBadge status={visit.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-3 py-3 text-[0.625rem] text-muted-foreground">
              No visit logs fall inside the selected dates.
            </p>
          )}
          <p className="border-t px-3 py-2 text-[0.625rem] text-muted-foreground">
            All visit logs in this range are attached to this plan when you save.
          </p>
        </div>

        <p className="mt-3 text-[0.625rem] text-muted-foreground">
          {editingId
            ? "Updating the date range re-syncs the visits attached to this plan."
            : "New visit plans start with the database default status."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/visits/plans")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={savePlan} disabled={saving}>
            <Save />
            {saving ? "Saving…" : "Save plan"}
          </Button>
        </div>
      </div>
    </div>
  )
}
