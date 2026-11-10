"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { createExpensePlan, updateExpensePlan } from "@/actions/expense.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { EXPENSE_PLAN_STATUSES } from "@/types/database"
import type { ExpensePlanWithRelations } from "@/lib/data/operations"
import { humanize } from "@/lib/format"

const today = () => new Date().toISOString().slice(0, 10)

export function ExpensePlanForm({
  plan,
}: {
  plan?: ExpensePlanWithRelations | null
}) {
  const router = useRouter()
  const editingId = plan?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    title: plan?.title ?? "",
    description: plan?.description ?? "",
    startDate: plan?.start_date ?? today(),
    endDate: plan?.end_date ?? today(),
    status: (plan?.status ?? "draft").toUpperCase(),
    currency: plan?.currency ?? "PHP",
  })

  async function savePlan() {
    if (!draft.title.trim()) {
      toast.add({ type: "error", title: "A plan title is required" })
      return
    }
    setSaving(true)
    const result = editingId
      ? await updateExpensePlan({
          id: editingId,
          title: draft.title,
          description: draft.description,
          startDate: draft.startDate,
          endDate: draft.endDate,
          status: draft.status,
          currency: draft.currency,
        })
      : await createExpensePlan({
          title: draft.title,
          description: draft.description,
          startDate: draft.startDate,
          endDate: draft.endDate,
          currency: draft.currency,
        })
    setSaving(false)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not save expense plan",
        description: result.error,
      })
      return
    }
    toast.add({
      type: "success",
      title: editingId ? "Expense plan updated" : "Expense plan created",
    })
    router.push(`/expenses/plans/${editingId ?? result.data.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/expenses/plans")}
      >
        <ArrowLeft />
        Back to expense plans
      </Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 rounded-md border bg-muted/30 p-2 text-[0.625rem] text-muted-foreground">
          This plan is assigned to the signed-in employee. No employee selection is
          required.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="plan-title">Plan title</Label>
            <Input
              id="plan-title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="October field expenses"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-start">Start date</Label>
            <Input
              id="plan-start"
              type="date"
              value={draft.startDate}
              onChange={(event) =>
                setDraft({ ...draft, startDate: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-end">End date</Label>
            <Input
              id="plan-end"
              type="date"
              value={draft.endDate}
              onChange={(event) =>
                setDraft({ ...draft, endDate: event.target.value })
              }
            />
          </div>
          {editingId ? (
            <div className="space-y-1.5">
              <Label htmlFor="plan-status">Status</Label>
              <NativeSelect
                id="plan-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value })
                }
                className="w-full"
              >
                {EXPENSE_PLAN_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="plan-currency">Currency</Label>
            <Input
              id="plan-currency"
              value={draft.currency}
              onChange={(event) =>
                setDraft({ ...draft, currency: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="plan-description">Description</Label>
            <Input
              id="plan-description"
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
              placeholder="Purpose or cost center"
            />
          </div>
        </div>
        {!editingId ? (
          <p className="mt-3 text-[0.625rem] text-muted-foreground">
            New plans start with the database default status. Status can be changed
            after the plan is created.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/expenses/plans")}
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
