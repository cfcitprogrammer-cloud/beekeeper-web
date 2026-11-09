import { notFound } from "next/navigation"
import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ExpenseForm } from "@/components/expenses/expense-form"
import { PageHeader } from "@/components/shared/page-header"
import { getExpensePlan } from "@/lib/data/operations"

export default async function NewExpensePage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  await requirePermission(PERMISSIONS.EXPENSES_CREATE)
  const planResult = await getExpensePlan(planId)
  if (!planResult.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="Add expense" description={planResult.data.title} icon={Plus} /><ExpenseForm plan={planResult.data} /></div>)
}
