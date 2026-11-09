"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Plus, Receipt, Trash2, Wallet } from "lucide-react"

import { deleteExpense } from "@/actions/expense.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { formatCurrency, formatDate, humanize } from "@/lib/format"
import type { Expense } from "@/db/models/models"
import type { ExpensePlanWithRelations } from "@/lib/data/operations"

export function ExpensePlanDetail({ plan }: { plan: ExpensePlanWithRelations }) {
  const router = useRouter()

  async function removeExpense(expense: Expense) {
    if (!window.confirm(`Delete expense "${expense.description}"?`)) return
    const result = await deleteExpense(expense.id)
    if (!result.success) { toast.add({ type: "error", title: "Could not delete expense", description: result.error }); return }
    toast.add({ type: "success", title: "Expense deleted" })
    router.refresh()
  }

  const columns: DataTableColumn<Expense>[] = [
    { id: "date", header: "Date", sortValue: (row) => row.expense_date, cell: (row) => <span className="text-xs">{formatDate(row.expense_date)}</span> },
    { id: "description", header: "Expense", sortValue: (row) => row.description, cell: (row) => (<div><p className="text-xs font-medium">{row.description}</p><p className="text-[0.625rem] text-muted-foreground">{humanize(row.category)}</p></div>) },
    { id: "amount", header: "Amount", align: "right", sortValue: (row) => row.amount, cell: (row) => <span className="text-xs font-medium tabular-nums">{formatCurrency(row.amount)}</span> },
    { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { id: "actions", header: "", align: "right", cell: (row) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Edit expense" render={<Link href={`/expenses/plans/${plan.id}/expenses/${row.id}/edit`} />}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => removeExpense(row)} aria-label="Delete expense"><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href="/expenses" />}><ArrowLeft />Back to expenses</Button>
        <Button size="sm" render={<Link href={`/expenses/plans/${plan.id}/edit`} />}><Pencil />Edit plan</Button>
        <Button size="sm" render={<Link href={`/expenses/plans/${plan.id}/expenses/new`} />}><Plus />Add expense</Button>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wallet className="size-5" /></span>
          <div><h2 className="text-lg font-semibold">{plan.title}</h2><p className="text-sm text-muted-foreground">{plan.employee ? `${plan.employee.first_name} ${plan.employee.last_name}` : "—"} · {formatDate(plan.start_date)} → {formatDate(plan.end_date)}</p><div className="mt-2"><StatusBadge status={plan.status} /></div></div>
        </div>
        {plan.description ? <p className="mt-4 text-sm">{plan.description}</p> : null}
        <div className="mt-4 text-sm font-medium">Total: {formatCurrency(plan.total_amount)} {plan.currency}</div>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <DataTable data={plan.expenses} columns={columns} getRowId={(row) => row.id} searchable={(row) => `${row.description} ${row.category}`} searchPlaceholder="Search expenses…" pageSize={10} emptyTitle="No expenses in this plan" emptyDescription="Add the first expense for this dated plan." emptyIcon={Receipt} />
      </div>
    </div>
  )
}
