"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Pencil, Plus, Trash2, Wallet } from "lucide-react"

import { deleteExpensePlan } from "@/actions/expense.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { formatCurrency, formatDate } from "@/lib/format"
import type { ExpensePlanWithRelations } from "@/lib/data/operations"

export function ExpensePlansManager({ plans = [] }: { plans: ExpensePlanWithRelations[] }) {
  const router = useRouter()

  async function removePlan(plan: ExpensePlanWithRelations) {
    if (!window.confirm(`Delete plan "${plan.title}" and all its expenses?`)) return
    const result = await deleteExpensePlan(plan.id)
    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not delete plan",
        description: result.error,
      })
      return
    }
    toast.add({ type: "success", title: "Expense plan deleted" })
    router.refresh()
  }

  const columns: DataTableColumn<ExpensePlanWithRelations>[] = [
    {
      id: "plan",
      header: "Expense plan",
      sortValue: (row) => row.title,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.title}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.employee
              ? `${row.employee.first_name} ${row.employee.last_name} · ${row.employee.employee_no}`
              : "Unknown employee"}
          </p>
        </div>
      ),
    },
    {
      id: "range",
      header: "Date range",
      hideBelow: "md",
      sortValue: (row) => row.start_date,
      cell: (row) => (
        <span className="text-xs">
          {formatDate(row.start_date)} → {formatDate(row.end_date)}
        </span>
      ),
    },
    {
      id: "expenses",
      header: "Items",
      align: "right",
      sortValue: (row) => row.expenses.length,
      cell: (row) => <span className="text-xs tabular-nums">{row.expenses.length}</span>,
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      sortValue: (row) => row.total_amount,
      cell: (row) => (
        <span className="text-xs font-medium tabular-nums">
          {formatCurrency(row.total_amount)}
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
            aria-label="View plan"
            render={<Link href={`/expenses/plans/${row.id}`} />}
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit plan"
            render={<Link href={`/expenses/plans/${row.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removePlan(row)}
            aria-label="Delete plan"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      data={plans}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.title,
          row.description,
          row.employee?.first_name,
          row.employee?.last_name,
          row.employee?.employee_no,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search plans or employees…"
      pageSize={10}
      emptyTitle="No expense plans yet"
      emptyDescription="Create a dated plan for an employee, then add expense items."
      emptyIcon={Wallet}
      onRowClick={(row) => router.push(`/expenses/plans/${row.id}`)}
      toolbar={
        <Button size="sm" render={<Link href="/expenses/plans/new" />}>
          <Plus />
          New expense plan
        </Button>
      }
    />
  )
}
