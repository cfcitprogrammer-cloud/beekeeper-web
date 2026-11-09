"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Receipt, Save } from "lucide-react"

import { createExpense, updateExpense } from "@/actions/expense.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { EXPENSE_STATUSES } from "@/types/database"
import { humanize } from "@/lib/format"
import type { Expense } from "@/db/models/models"
import type { ExpensePlanWithRelations } from "@/lib/data/operations"

export function ExpenseForm({ plan, expense }: { plan: ExpensePlanWithRelations; expense?: Expense | null }) {
  const router = useRouter()
  const editingId = expense?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    expenseDate: expense?.expense_date ?? plan.start_date,
    category: expense?.category ?? "travel",
    description: expense?.description ?? "",
    amount: expense ? String(expense.amount) : "0",
    status: (expense?.status ?? "pending").toUpperCase(),
    receiptPath: expense?.receipt_path ?? "",
    notes: expense?.notes ?? "",
  })

  async function saveExpense() {
    if (!draft.description.trim()) { toast.add({ type: "error", title: "Description is required" }); return }
    setSaving(true)
    const payload = { planId: plan.id, expenseDate: draft.expenseDate, category: draft.category, description: draft.description, amount: Number(draft.amount), status: draft.status, receiptPath: draft.receiptPath, notes: draft.notes }
    const result = editingId ? await updateExpense({ ...payload, id: editingId }) : await createExpense(payload)
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not save expense", description: result.error }); return }
    toast.add({ type: "success", title: editingId ? "Expense updated" : "Expense added" })
    router.push(`/expenses/plans/${plan.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push(`/expenses/plans/${plan.id}`)}><ArrowLeft />Back to plan</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted-foreground">{plan.title} · {plan.start_date} → {plan.end_date}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="expense-date">Expense date</Label><Input id="expense-date" type="date" value={draft.expenseDate} onChange={(event) => setDraft({ ...draft, expenseDate: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="expense-amount">Amount</Label><Input id="expense-amount" type="number" min={0} step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="expense-description">Description</Label><Input id="expense-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Taxi to outlet, client meal, supplies…" /></div>
          <div className="space-y-1.5"><Label htmlFor="expense-category">Category</Label><Input id="expense-category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="travel" /></div>
          <div className="space-y-1.5"><Label htmlFor="expense-status">Status</Label><NativeSelect id="expense-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="w-full">{EXPENSE_STATUSES.map((value) => (<option key={value} value={value}>{humanize(value)}</option>))}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="expense-receipt">Receipt path</Label><Input id="expense-receipt" value={draft.receiptPath} onChange={(event) => setDraft({ ...draft, receiptPath: event.target.value })} placeholder="Optional storage path" /></div>
          <div className="space-y-1.5"><Label htmlFor="expense-notes">Notes</Label><Input id="expense-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Optional notes" /></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push(`/expenses/plans/${plan.id}`)} disabled={saving}>Cancel</Button>
          <Button onClick={saveExpense} disabled={saving}>{editingId ? <Save /> : <Receipt />}{saving ? "Saving…" : "Save expense"}</Button>
        </div>
      </div>
    </div>
  )
}
