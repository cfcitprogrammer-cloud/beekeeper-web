"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Banknote, Eye, Pencil, Plus, Receipt, Trash2, Wallet } from "lucide-react"

import { deleteExpense, deleteExpensePlan } from "@/actions/expense.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { EmployeeWithRelations } from "@/types/database"
import type { ExpensePlanWithRelations } from "@/lib/data/operations"
import type { Expense } from "@/db/models/models"
import { formatCurrency, formatDate, humanize } from "@/lib/format"

export function ExpensesManager({
  plans,
}: {
  plans: ExpensePlanWithRelations[]
  employees: EmployeeWithRelations[]
}) {
  const router = useRouter()
  const [selectedPlanId, setSelectedPlanId] = React.useState(plans[0]?.id ?? "")
  const resolvedPlanId =
    selectedPlanId && plans.some((plan) => plan.id === selectedPlanId)
      ? selectedPlanId
      : (plans[0]?.id ?? "")
  const selectedPlan = plans.find((plan) => plan.id === resolvedPlanId) ?? null

  async function removePlan(plan: ExpensePlanWithRelations) {
    if (!window.confirm(`Delete plan "${plan.title}" and all its expenses?`)) return
    const result = await deleteExpensePlan(plan.id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete plan", description: result.error }); return }
    toast.add({ type: "success", title: "Expense plan deleted" })
    router.refresh()
  }

  async function removeExpense(expense: Expense) {
    if (!window.confirm(`Delete expense "${expense.description}"?`)) return
    const result = await deleteExpense(expense.id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete expense", description: result.error }); return }
    toast.add({ type: "success", title: "Expense deleted" })
    router.refresh()
  }

  const planColumns: DataTableColumn<ExpensePlanWithRelations>[] = [
    { id: "plan", header: "Expense plan", sortValue: (row) => row.title, cell: (row) => (<div><p className="text-xs font-medium">{row.title}</p><p className="text-[0.625rem] text-muted-foreground">{row.employee ? `${row.employee.first_name} ${row.employee.last_name} · ${row.employee.employee_no}` : "Unknown employee"}</p></div>) },
    { id: "range", header: "Date range", hideBelow: "md", sortValue: (row) => row.start_date, cell: (row) => <span className="text-xs">{formatDate(row.start_date)} → {formatDate(row.end_date)}</span> },
    { id: "expenses", header: "Expenses", align: "right", sortValue: (row) => row.expenses.length, cell: (row) => <span className="text-xs tabular-nums">{row.expenses.length}</span> },
    { id: "total", header: "Total", align: "right", sortValue: (row) => row.total_amount, cell: (row) => <span className="text-xs font-medium tabular-nums">{formatCurrency(row.total_amount)}</span> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { id: "actions", header: "", align: "right", cell: (row) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="View plan" render={<Link href={`/expenses/plans/${row.id}`} />}><Eye className="size-3.5" /></Button>
        <Button variant="outline" size="sm" onClick={() => setSelectedPlanId(row.id)}>Manage</Button>
        <Button variant="ghost" size="icon-sm" aria-label="Edit plan" render={<Link href={`/expenses/plans/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => removePlan(row)} aria-label="Delete plan"><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
    )},
  ]

  const expenseColumns: DataTableColumn<Expense>[] = [
    { id: "date", header: "Date", sortValue: (row) => row.expense_date, cell: (row) => <span className="text-xs">{formatDate(row.expense_date)}</span> },
    { id: "description", header: "Expense", sortValue: (row) => row.description, cell: (row) => (<div><p className="text-xs font-medium">{row.description}</p><p className="text-[0.625rem] text-muted-foreground">{humanize(row.category)}</p></div>) },
    { id: "amount", header: "Amount", align: "right", sortValue: (row) => row.amount, cell: (row) => <span className="text-xs font-medium tabular-nums">{formatCurrency(row.amount)}</span> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { id: "actions", header: "", align: "right", cell: (row) => selectedPlan ? (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Edit expense" render={<Link href={`/expenses/plans/${selectedPlan.id}/expenses/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => removeExpense(row)} aria-label="Delete expense"><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
    ) : null },
  ]

  return (
    <>
      <DataTable data={plans} columns={planColumns} getRowId={(row) => row.id} searchable={(row) => [row.title, row.description, row.employee?.first_name, row.employee?.last_name, row.employee?.employee_no].filter(Boolean).join(" ")} searchPlaceholder="Search plans or employees…" pageSize={8} emptyTitle="No expense plans yet" emptyDescription="Create a dated plan for an employee, then add individual expenses." emptyIcon={Wallet} onRowClick={(row) => router.push(`/expenses/plans/${row.id}`)} toolbar={<Button size="sm" render={<Link href="/expenses/plans/new" />}><Plus />New expense plan</Button>} />

      <div className="mt-5">
        {selectedPlan ? (
          <div className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">Expenses · {selectedPlan.currency}</p>
                <p className="font-heading text-sm font-semibold">{selectedPlan.title}</p>
                <p className="text-[0.625rem] text-muted-foreground">{formatDate(selectedPlan.start_date)} → {formatDate(selectedPlan.end_date)} · {formatCurrency(selectedPlan.total_amount)}</p>
              </div>
              <Button size="sm" render={<Link href={`/expenses/plans/${selectedPlan.id}/expenses/new`} />}><Plus />Add expense</Button>
            </div>
            <div className="p-3">
              <DataTable data={selectedPlan.expenses} columns={expenseColumns} getRowId={(row) => row.id} searchable={(row) => `${row.description} ${row.category}`} searchPlaceholder="Search expenses…" pageSize={8} emptyTitle="No expenses in this plan" emptyDescription="Add the first expense for this dated plan." emptyIcon={Receipt} />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center"><Banknote className="mx-auto size-6 text-muted-foreground" /><p className="mt-2 text-xs font-medium">Select an expense plan</p><p className="text-[0.625rem] text-muted-foreground">Choose a plan above to view and add its expenses.</p></div>
        )}
      </div>
    </>
  )
}
