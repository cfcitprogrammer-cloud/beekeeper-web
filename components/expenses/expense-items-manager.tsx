"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Paperclip, Pencil, Plus, Receipt, Trash2 } from "lucide-react"

import { deleteExpense } from "@/actions/expense.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatCurrency, formatDate, humanize } from "@/lib/format"
import {
  EXPENSE_STATUSES,
  type ExpensePlan,
} from "@/types/database"
import type { ExpenseWithRelations } from "@/lib/data/operations"

export function ExpenseItemsManager({
  expenses,
  plans,
}: {
  expenses: ExpenseWithRelations[]
  plans: Pick<ExpensePlan, "id" | "title">[]
}) {
  const router = useRouter()
  const [status, setStatus] = React.useState("all")
  const [planId, setPlanId] = React.useState("all")
  const [reimbursable, setReimbursable] = React.useState("all")

  const filtered = React.useMemo(() => {
    return expenses.filter((expense) => {
      if (status !== "all" && expense.status.toLowerCase() !== status) return false
      if (planId === "standalone" && expense.plan_id) return false
      if (planId !== "all" && planId !== "standalone" && expense.plan_id !== planId) {
        return false
      }
      if (reimbursable === "yes" && !expense.is_reimbursable) return false
      if (reimbursable === "no" && expense.is_reimbursable) return false
      return true
    })
  }, [expenses, status, planId, reimbursable])

  async function removeExpense(expense: ExpenseWithRelations) {
    if (!window.confirm(`Delete expense "${expense.description}"?`)) return
    const result = await deleteExpense(expense.id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete expense",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Expense deleted" })
    router.refresh()
  }

  const columns: DataTableColumn<ExpenseWithRelations>[] = [
    {
      id: "date",
      header: "Date",
      sortValue: (row) => row.expense_date,
      cell: (row) => <span className="text-xs">{formatDate(row.expense_date)}</span>,
    },
    {
      id: "description",
      header: "Expense",
      sortValue: (row) => row.description,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.description}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.category?.name ?? humanize(row.category)}
          </p>
        </div>
      ),
    },
    {
      id: "employee",
      header: "Employee",
      hideBelow: "md",
      sortValue: (row) =>
        row.employee ? `${row.employee.last_name} ${row.employee.first_name}` : "",
      cell: (row) => (
        <div>
          <p className="text-xs">
            {row.employee
              ? `${row.employee.first_name} ${row.employee.last_name}`
              : "Unknown employee"}
          </p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.employee?.employee_no ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      hideBelow: "lg",
      sortValue: (row) => row.plan?.title ?? "",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.plan?.title ?? "Standalone"}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (row) => row.amount,
      cell: (row) => (
        <span className="text-xs font-medium tabular-nums">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      id: "reimbursable",
      header: "Reimbursable",
      hideBelow: "lg",
      cell: (row) => (
        <span className="text-[0.625rem] text-muted-foreground">
          {row.is_reimbursable ? "Yes" : "No"}
        </span>
      ),
    },
    {
      id: "attachments",
      header: "Files",
      align: "center",
      hideBelow: "md",
      sortValue: (row) => row.attachments?.length ?? 0,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-[0.625rem] text-muted-foreground">
          <Paperclip className="size-3" />
          {row.attachments?.length ?? 0}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit expense"
            render={<Link href={`/expenses/items/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeExpense(row)}
            aria-label="Delete expense"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={filtered}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.description,
          row.notes,
          row.category?.name,
          row.category?.code,
          row.plan?.title,
          row.employee?.first_name,
          row.employee?.last_name,
          row.employee?.employee_no,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search expense, employee or plan…"
      initialSort={{ id: "date", desc: true }}
      pageSize={10}
      emptyTitle="No expense items match your filters"
      emptyDescription="Clear the filters or add a new expense item."
      emptyIcon={Receipt}
      filters={
        <>
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className="w-auto"
          >
            <option value="all">All statuses</option>
            {EXPENSE_STATUSES.map((value) => {
              const normalized = value.toLowerCase()
              return (
                <option key={value} value={normalized}>
                  {humanize(value)}
                </option>
              )
            })}
          </NativeSelect>
          <NativeSelect
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            aria-label="Filter by plan"
            className="w-auto"
          >
            <option value="all">All plans</option>
            <option value="standalone">Standalone</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={reimbursable}
            onChange={(event) => setReimbursable(event.target.value)}
            aria-label="Filter by reimbursement"
            className="w-auto"
          >
            <option value="all">All reimbursements</option>
            <option value="yes">Reimbursable</option>
            <option value="no">Not reimbursable</option>
          </NativeSelect>
        </>
      }
      toolbar={
        <Button size="sm" render={<Link href="/expenses/items/new" />}>
          <Plus />
          New expense item
        </Button>
      }
    />
  )
}
