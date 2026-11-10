import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { ExpenseForm } from "@/components/expenses/expense-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getExpense,
  getExpenseCategories,
  getExpensePlans,
} from "@/lib/data/operations"

export default async function EditExpenseItemPage({
  params,
}: {
  params: Promise<{ expenseId: string }>
}) {
  const { expenseId } = await params
  await requirePermission(PERMISSIONS.EXPENSES_UPDATE)

  const [expenseResult, plansResult, categoriesResult] = await Promise.all([
    getExpense(expenseId),
    getExpensePlans(),
    getExpenseCategories(),
  ])

  if (!expenseResult.data) notFound()

  const plans = (plansResult.data ?? []).filter(
    (plan) => plan.employee_id === expenseResult.data?.employee_id
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Edit expense item"
        description={expenseResult.data.description}
        icon={Pencil}
      />
      <ExpenseForm
        expense={expenseResult.data}
        plans={plans}
        categories={categoriesResult.data ?? []}
      />
    </div>
  )
}
