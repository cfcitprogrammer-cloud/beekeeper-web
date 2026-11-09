"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save, Wallet } from "lucide-react"

import { createExpensePlan, updateExpensePlan } from "@/actions/expense.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { EXPENSE_PLAN_STATUSES, type EmployeeWithRelations } from "@/types/database"
import type { ExpensePlanWithRelations } from "@/lib/data/operations"
import { humanize } from "@/lib/format"

const today = () => new Date().toISOString().slice(0, 10)

export function ExpensePlanForm({ plan, employees }: { plan?: ExpensePlanWithRelations | null; employees: EmployeeWithRelations[] }) {
  const router = useRouter()
  const editingId = plan?.id ?? null
  const [saving, setSaving] = React.useState(false)
  const activeEmployees = employees.filter((employee) => ["ACTIVE", "PROBATION", "ON_LEAVE"].includes(employee.status))
  const [draft, setDraft] = React.useState({
    employeeId: plan?.employee_id ?? "",
    title: plan?.title ?? "",
    description: plan?.description ?? "",
    startDate: plan?.start_date ?? today(),
    endDate: plan?.end_date ?? today(),
    status: (plan?.status ?? "draft").toUpperCase(),
    currency: plan?.currency ?? "PHP",
  })

  async function savePlan() {
    if (!draft.employeeId || !draft.title.trim()) { toast.add({ type: "error", title: "Employee and title are required" }); return }
    setSaving(true)
    const payload = { employeeId: draft.employeeId, title: draft.title, description: draft.description, startDate: draft.startDate, endDate: draft.endDate, status: draft.status, currency: draft.currency }
    const result = editingId ? await updateExpensePlan({ ...payload, id: editingId }) : await createExpensePlan(payload)
    setSaving(false)
    if (!result.success) { toast.add({ type: "error", title: "Could not save expense plan", description: result.error }); return }
    toast.add({ type: "success", title: editingId ? "Expense plan updated" : "Expense plan created" })
    router.push(editingId ? `/expenses/plans/${editingId}` : `/expenses/plans/${result.data.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/expenses")}><ArrowLeft />Back to expenses</Button>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="plan-employee">Employee</Label><NativeSelect id="plan-employee" value={draft.employeeId} onChange={(event) => setDraft({ ...draft, employeeId: event.target.value })} className="w-full"><option value="">Select an employee</option>{activeEmployees.map((employee) => (<option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name} · {employee.employee_no}</option>))}</NativeSelect></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="plan-title">Plan title</Label><Input id="plan-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="October field expenses" /></div>
          <div className="space-y-1.5"><Label htmlFor="plan-start">Start date</Label><Input id="plan-start" type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="plan-end">End date</Label><Input id="plan-end" type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="plan-status">Status</Label><NativeSelect id="plan-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="w-full">{EXPENSE_PLAN_STATUSES.map((value) => (<option key={value} value={value}>{humanize(value)}</option>))}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="plan-currency">Currency</Label><Input id="plan-currency" value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="plan-description">Description</Label><Input id="plan-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Purpose or cost center" /></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/expenses")} disabled={saving}>Cancel</Button>
          <Button onClick={savePlan} disabled={saving}>{editingId ? <Save /> : <Wallet />}{saving ? "Saving…" : "Save plan"}</Button>
        </div>
      </div>
    </div>
  )
}
