"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { createVisitPlan, updateVisitPlan } from "@/actions/visit.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { humanize } from "@/lib/format"
import { VISIT_PLAN_STATUSES } from "@/types/database"
import type { VisitPlanWithRelations } from "@/lib/data/operations"

const today = () => new Date().toISOString().slice(0, 10)

export function VisitPlanForm({
  plan,
}: {
  plan?: VisitPlanWithRelations | null
}) {
  const router = useRouter()
  const editingId = plan?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    name: plan?.name ?? "",
    startDate: plan?.start_date ?? today(),
    endDate: plan?.end_date ?? today(),
    status: (plan?.status ?? "draft").toUpperCase(),
    notes: plan?.notes ?? "",
  })

  async function savePlan() {
    if (!draft.name.trim()) {
      toast.add({ type: "error", title: "A plan name is required" })
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
              onChange={(event) =>
                setDraft({ ...draft, startDate: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visit-plan-end">End date</Label>
            <Input
              id="visit-plan-end"
              type="date"
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
        <p className="mt-3 text-[0.625rem] text-muted-foreground">
          {editingId
            ? "A visit plan simply reserves a date range for an employee. Any outlet can be visited."
            : "New visit plans start with the database default status. A plan does not reserve specific outlets."}
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
