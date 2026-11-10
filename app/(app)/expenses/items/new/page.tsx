import { Plus } from "lucide-react"

import { ExpenseForm } from "@/components/expenses/expense-form"
import { PageHeader } from "@/components/shared/page-header"
import { getAccessContext } from "@/lib/auth/access"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getExpenseCategories,
  getExpensePlans,
} from "@/lib/data/operations"

export default async function NewExpenseItemPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>
}) {
  await requirePermission(PERMISSIONS.EXPENSES_CREATE)

  const { planId } = await searchParams
  const [plansResult, categoriesResult, access] = await Promise.all([
    getExpensePlans(),
    getExpenseCategories(),
    getAccessContext(),
  ])

  const plans = access.employee
    ? plansResult.data.filter(
        (plan) => plan.employee_id === access.employee?.id
      )
    : []

  const initialPlanId =
    planId && plans.some((plan) => plan.id === planId) ? planId : undefined

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="New expense item"
        description="Record an expense with or without an expense plan. Multiple attachments are supported."
        icon={Plus}
      />
      <ExpenseForm
        plans={plans}
        categories={categoriesResult.data}
        initialPlanId={initialPlanId}
      />
    </div>
  )
}
