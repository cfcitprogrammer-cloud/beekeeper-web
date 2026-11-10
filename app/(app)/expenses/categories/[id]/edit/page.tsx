import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { ExpenseCategoryForm } from "@/components/expenses/expense-category-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getExpenseCategory } from "@/lib/data/operations"

export default async function EditExpenseCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.EXPENSES_UPDATE)

  const result = await getExpenseCategory(id)
  if (!result.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Edit expense category"
        description={`Update ${result.data.name}.`}
        icon={Pencil}
      />
      <ExpenseCategoryForm category={result.data} />
    </div>
  )
}
