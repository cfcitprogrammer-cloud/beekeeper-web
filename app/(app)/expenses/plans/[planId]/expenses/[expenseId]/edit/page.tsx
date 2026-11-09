import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ExpenseForm } from "@/components/expenses/expense-form"
import { PageHeader } from "@/components/shared/page-header"
import { getExpense, getExpensePlan } from "@/lib/data/operations"

export default async function EditExpensePage({ params }: { params: Promise<{ planId: string; expenseId: string }> }) {
  const { planId, expenseId } = await params
  await requirePermission(PERMISSIONS.EXPENSES_UPDATE)
  const [planResult, expenseResult] = await Promise.all([getExpensePlan(planId), getExpense(expenseId)])
  if (!planResult.data || !expenseResult.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="Edit expense" description={planResult.data.title} icon={Pencil} /><ExpenseForm plan={planResult.data} expense={expenseResult.data} /></div>)
}
