import { Receipt } from "lucide-react"

import { ExpenseItemsManager } from "@/components/expenses/expense-items-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getExpensePlans, getExpenses } from "@/lib/data/operations"

export default async function ExpenseItemsPage() {
  await requirePermission(PERMISSIONS.EXPENSES_VIEW)

  const [expensesResult, plansResult] = await Promise.all([
    getExpenses(),
    getExpensePlans(),
  ])

  const plans = (plansResult.data ?? []).map((plan) => ({ id: plan.id, title: plan.title }))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Expense items"
        description="Every expense item, including standalone items that are not attached to a plan."
        icon={Receipt}
      />
      <ExpenseItemsManager expenses={expensesResult.data ?? []} plans={plans} />
    </div>
  )
}
