import { Tags } from "lucide-react"

import { ExpenseCategoriesManager } from "@/components/expenses/expense-categories-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getExpenseCategories } from "@/lib/data/operations"

export default async function ExpenseCategoriesPage() {
  await requirePermission(PERMISSIONS.EXPENSES_VIEW)

  const result = await getExpenseCategories()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Expense categories"
        description="Master data used to classify expense items. Categories are fully configurable."
        icon={Tags}
      />
      <ExpenseCategoriesManager categories={result.data ?? []} />
    </div>
  )
}
