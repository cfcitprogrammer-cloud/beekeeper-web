"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Banknote, Pencil, Plus, Receipt, Trash2, Wallet } from "lucide-react"

import {
  createExpense,
  createExpensePlan,
  deleteExpense,
  deleteExpensePlan,
  updateExpense,
  updateExpensePlan,
} from "@/actions/expense.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import {
  EXPENSE_PLAN_STATUSES,
  EXPENSE_STATUSES,
  type EmployeeWithRelations,
} from "@/types/database"
import type { ExpensePlanWithRelations } from "@/lib/data/operations"
import type { Expense } from "@/db/models/models"
import { formatCurrency, formatDate, humanize } from "@/lib/format"

const today = () => new Date().toISOString().slice(0, 10)

const emptyPlan = {
  employeeId: "",
  title: "",
  description: "",
  startDate: today(),
  endDate: today(),
  status: "DRAFT",
  currency: "PHP",
}

const emptyExpense = {
  expenseDate: today(),
  category: "travel",
  description: "",
  amount: "0",
  status: "PENDING",
  receiptPath: "",
  notes: "",
}

export function ExpensesManager({
  plans,
  employees,
}: {
  plans: ExpensePlanWithRelations[]
  employees: EmployeeWithRelations[]
}) {
  const router = useRouter()
  const [selectedPlanId, setSelectedPlanId] = React.useState(plans[0]?.id ?? "")
  const [planOpen, setPlanOpen] = React.useState(false)
  const [editingPlanId, setEditingPlanId] = React.useState<string | null>(null)
  const [planDraft, setPlanDraft] = React.useState(emptyPlan)
  const [expenseOpen, setExpenseOpen] = React.useState(false)
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null)
  const [expenseDraft, setExpenseDraft] = React.useState(emptyExpense)
  const [saving, setSaving] = React.useState(false)

  const resolvedPlanId =
    selectedPlanId && plans.some((plan) => plan.id === selectedPlanId)
      ? selectedPlanId
      : (plans[0]?.id ?? "")
  const selectedPlan = plans.find((plan) => plan.id === resolvedPlanId) ?? null
  const activeEmployees = employees.filter((employee) =>
    ["ACTIVE", "PROBATION", "ON_LEAVE"].includes(employee.status)
  )

  function openCreatePlan() {
    setEditingPlanId(null)
    setPlanDraft(emptyPlan)
    setPlanOpen(true)
  }

  function openEditPlan(plan: ExpensePlanWithRelations) {
    setEditingPlanId(plan.id)
    setPlanDraft({
      employeeId: plan.employee_id,
      title: plan.title,
      description: plan.description ?? "",
      startDate: plan.start_date,
      endDate: plan.end_date,
      status: plan.status,
      currency: plan.currency,
    })
    setPlanOpen(true)
  }

  async function savePlan() {
    if (!planDraft.employeeId || !planDraft.title.trim()) {
      toast.add({ type: "error", title: "Employee and title are required" })
      return
    }
    setSaving(true)
    const payload = {
      employeeId: planDraft.employeeId,
      title: planDraft.title,
      description: planDraft.description,
      startDate: planDraft.startDate,
      endDate: planDraft.endDate,
      status: planDraft.status,
      currency: planDraft.currency,
    }
    const result = editingPlanId
      ? await updateExpensePlan({ ...payload, id: editingPlanId })
      : await createExpensePlan(payload)
    setSaving(false)

    if (!result.success) {
      toast.add({ type: "error", title: "Could not save expense plan", description: result.error })
      return
    }
    toast.add({
      type: "success",
      title: editingPlanId ? "Expense plan updated" : "Expense plan created",
    })
    if (!editingPlanId) setSelectedPlanId(result.data.id)
    setPlanOpen(false)
    router.refresh()
  }

  async function removePlan(plan: ExpensePlanWithRelations) {
    if (!window.confirm(`Delete plan "${plan.title}" and all its expenses?`)) return
    const result = await deleteExpensePlan(plan.id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete plan", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Expense plan deleted" })
    router.refresh()
  }

  function openCreateExpense() {
    if (!selectedPlan) return
    setEditingExpenseId(null)
    setExpenseDraft({
      ...emptyExpense,
      expenseDate:
        selectedPlan.start_date <= today() && today() <= selectedPlan.end_date
          ? today()
          : selectedPlan.start_date,
    })
    setExpenseOpen(true)
  }

  function openEditExpense(expense: Expense) {
    setEditingExpenseId(expense.id)
    setExpenseDraft({
      expenseDate: expense.expense_date,
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      status: expense.status.toUpperCase(),
      receiptPath: expense.receipt_path ?? "",
      notes: expense.notes ?? "",
    })
    setExpenseOpen(true)
  }

  async function saveExpense() {
    if (!selectedPlan) return
    if (!expenseDraft.description.trim()) {
      toast.add({ type: "error", title: "Description is required" })
      return
    }
    setSaving(true)
    const payload = {
      planId: selectedPlan.id,
      expenseDate: expenseDraft.expenseDate,
      category: expenseDraft.category,
      description: expenseDraft.description,
      amount: Number(expenseDraft.amount),
      status: expenseDraft.status,
      receiptPath: expenseDraft.receiptPath,
      notes: expenseDraft.notes,
    }
    const result = editingExpenseId
      ? await updateExpense({ ...payload, id: editingExpenseId })
      : await createExpense(payload)
    setSaving(false)

    if (!result.success) {
      toast.add({ type: "error", title: "Could not save expense", description: result.error })
      return
    }
    toast.add({
      type: "success",
      title: editingExpenseId ? "Expense updated" : "Expense added",
    })
    setExpenseOpen(false)
    router.refresh()
  }

  async function removeExpense(expense: Expense) {
    if (!window.confirm(`Delete expense "${expense.description}"?`)) return
    const result = await deleteExpense(expense.id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete expense", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Expense deleted" })
    router.refresh()
  }

  const planColumns: DataTableColumn<ExpensePlanWithRelations>[] = [
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
      header: "Expenses",
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
          <Button variant="outline" size="sm" onClick={() => setSelectedPlanId(row.id)}>
            Manage
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEditPlan(row)}
            aria-label="Edit plan"
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

  const expenseColumns: DataTableColumn<Expense>[] = [
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
          <p className="text-[0.625rem] text-muted-foreground">{humanize(row.category)}</p>
        </div>
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
            onClick={() => openEditExpense(row)}
            aria-label="Edit expense"
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
    <>
      <DataTable
        data={plans}
        columns={planColumns}
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
        pageSize={8}
        emptyTitle="No expense plans yet"
        emptyDescription="Create a dated plan for an employee, then add individual expenses."
        emptyIcon={Wallet}
        toolbar={
          <Button size="sm" onClick={openCreatePlan}>
            <Plus />
            New expense plan
          </Button>
        }
      />

      <div className="mt-5">
        {selectedPlan ? (
          <div className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <p className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Expenses · {selectedPlan.currency}
                </p>
                <p className="font-heading text-sm font-semibold">{selectedPlan.title}</p>
                <p className="text-[0.625rem] text-muted-foreground">
                  {formatDate(selectedPlan.start_date)} → {formatDate(selectedPlan.end_date)} ·{" "}
                  {formatCurrency(selectedPlan.total_amount)}
                </p>
              </div>
              <Button size="sm" onClick={openCreateExpense}>
                <Plus />
                Add expense
              </Button>
            </div>
            <div className="p-3">
              <DataTable
                data={selectedPlan.expenses}
                columns={expenseColumns}
                getRowId={(row) => row.id}
                searchable={(row) => `${row.description} ${row.category}`}
                searchPlaceholder="Search expenses…"
                pageSize={8}
                emptyTitle="No expenses in this plan"
                emptyDescription="Add the first expense for this dated plan."
                emptyIcon={Receipt}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Banknote className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-xs font-medium">Select an expense plan</p>
            <p className="text-[0.625rem] text-muted-foreground">
              Choose a plan above to view and add its expenses.
            </p>
          </div>
        )}
      </div>

      <Modal
        open={planOpen}
        onOpenChange={setPlanOpen}
        title={editingPlanId ? "Edit expense plan" : "New expense plan"}
        description="Plans belong to one employee and define the date range for expenses."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePlan} disabled={saving}>
              <Wallet />
              {saving ? "Saving…" : "Save plan"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="plan-employee">Employee</Label>
            <NativeSelect
              id="plan-employee"
              value={planDraft.employeeId}
              onChange={(event) => setPlanDraft({ ...planDraft, employeeId: event.target.value })}
              className="w-full"
            >
              <option value="">Select an employee</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} · {employee.employee_no}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="plan-title">Plan title</Label>
            <Input
              id="plan-title"
              value={planDraft.title}
              onChange={(event) => setPlanDraft({ ...planDraft, title: event.target.value })}
              placeholder="October field expenses"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-start">Start date</Label>
            <Input
              id="plan-start"
              type="date"
              value={planDraft.startDate}
              onChange={(event) => setPlanDraft({ ...planDraft, startDate: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-end">End date</Label>
            <Input
              id="plan-end"
              type="date"
              value={planDraft.endDate}
              onChange={(event) => setPlanDraft({ ...planDraft, endDate: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-status">Status</Label>
            <NativeSelect
              id="plan-status"
              value={planDraft.status}
              onChange={(event) => setPlanDraft({ ...planDraft, status: event.target.value })}
              className="w-full"
            >
              {EXPENSE_PLAN_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-currency">Currency</Label>
            <Input
              id="plan-currency"
              value={planDraft.currency}
              onChange={(event) => setPlanDraft({ ...planDraft, currency: event.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="plan-description">Description</Label>
            <Input
              id="plan-description"
              value={planDraft.description}
              onChange={(event) => setPlanDraft({ ...planDraft, description: event.target.value })}
              placeholder="Purpose or cost center"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        title={editingExpenseId ? "Edit expense" : "Add expense"}
        description={
          selectedPlan
            ? `${selectedPlan.title} · ${formatDate(selectedPlan.start_date)} → ${formatDate(selectedPlan.end_date)}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveExpense} disabled={saving}>
              <Receipt />
              {saving ? "Saving…" : "Save expense"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="expense-date">Expense date</Label>
            <Input
              id="expense-date"
              type="date"
              value={expenseDraft.expenseDate}
              onChange={(event) =>
                setExpenseDraft({ ...expenseDraft, expenseDate: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount">Amount</Label>
            <Input
              id="expense-amount"
              type="number"
              min={0}
              step="0.01"
              value={expenseDraft.amount}
              onChange={(event) =>
                setExpenseDraft({ ...expenseDraft, amount: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="expense-description">Description</Label>
            <Input
              id="expense-description"
              value={expenseDraft.description}
              onChange={(event) =>
                setExpenseDraft({ ...expenseDraft, description: event.target.value })
              }
              placeholder="Taxi to outlet, client meal, supplies…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-category">Category</Label>
            <Input
              id="expense-category"
              value={expenseDraft.category}
              onChange={(event) =>
                setExpenseDraft({ ...expenseDraft, category: event.target.value })
              }
              placeholder="travel"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-status">Status</Label>
            <NativeSelect
              id="expense-status"
              value={expenseDraft.status}
              onChange={(event) =>
                setExpenseDraft({ ...expenseDraft, status: event.target.value })
              }
              className="w-full"
            >
              {EXPENSE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-receipt">Receipt path</Label>
            <Input
              id="expense-receipt"
              value={expenseDraft.receiptPath}
              onChange={(event) =>
                setExpenseDraft({ ...expenseDraft, receiptPath: event.target.value })
              }
              placeholder="Optional storage path"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-notes">Notes</Label>
            <Input
              id="expense-notes"
              value={expenseDraft.notes}
              onChange={(event) => setExpenseDraft({ ...expenseDraft, notes: event.target.value })}
              placeholder="Optional notes"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
