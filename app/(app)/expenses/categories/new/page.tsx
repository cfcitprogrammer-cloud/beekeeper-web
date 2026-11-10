import { Plus } from "lucide-react"

import { ExpenseCategoryForm } from "@/components/expenses/expense-category-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"

export default async function NewExpenseCategoryPage() {
  await requirePermission(PERMISSIONS.EXPENSES_CREATE)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="New expense category"
        description="Add a category to the expense master data."
        icon={Plus}
      />
      <ExpenseCategoryForm />
    </div>
  )
}
