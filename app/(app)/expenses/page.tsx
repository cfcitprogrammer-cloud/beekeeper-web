import { Banknote, Receipt, Wallet } from "lucide-react"

import { ExpensesManager } from "@/components/expenses/expenses-manager"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getExpensePlans } from "@/lib/data/operations"
import { getEmployees } from "@/lib/data/queries"
import { formatCurrency } from "@/lib/format"

export default async function ExpensesPage() {
  await requirePermission(PERMISSIONS.EXPENSES_VIEW)

  const [plansResult, employeesResult] = await Promise.all([
    getExpensePlans(),
    getEmployees(),
  ])

  const plans = plansResult.data
  const expenses = plans.flatMap((plan) => plan.expenses)
  const total = plans.reduce((sum, plan) => sum + Number(plan.total_amount ?? 0), 0)
  const pending = expenses.filter((expense) => expense.status === "pending")

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Expenses"
        description="Dated expense plans per employee, with multiple expenses, receipts and approval status."
        icon={Wallet}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Expense plans"
          value={plans.length}
          hint={`${plans.filter((plan) => plan.status === "draft" || plan.status === "submitted").length} open`}
          icon={Wallet}
          accent="primary"
        />
        <MetricCard
          label="Expenses"
          value={expenses.length}
          hint={`${pending.length} pending review`}
          icon={Receipt}
          accent="amber"
        />
        <MetricCard
          label="Planned total"
          value={formatCurrency(total)}
          hint="Across all expense plans"
          icon={Banknote}
          accent="emerald"
        />
      </div>

      <ExpensesManager plans={plans} employees={employeesResult.data} />
    </div>
  )
}
