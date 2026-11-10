import { Wallet } from "lucide-react"

import { ExpensePlansManager } from "@/components/expenses/expense-plans-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getExpensePlans } from "@/lib/data/operations"

export default async function ExpensePlansPage() {
  await requirePermission(PERMISSIONS.EXPENSES_VIEW)

  const result = await getExpensePlans()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Expense plans"
        description="Dated plans that group expense items for an employee. Items can also exist without a plan."
        icon={Wallet}
      />
      <ExpensePlansManager plans={result.data} />
    </div>
  )
}
