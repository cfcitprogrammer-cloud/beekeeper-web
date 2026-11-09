import { notFound } from "next/navigation"
import { Wallet } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ExpensePlanDetail } from "@/components/expenses/expense-plan-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getExpensePlan } from "@/lib/data/operations"

export default async function ExpensePlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  await requirePermission(PERMISSIONS.EXPENSES_VIEW)
  const result = await getExpensePlan(planId)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title={result.data.title} description="Expense plan details and expenses." icon={Wallet} /><ExpensePlanDetail plan={result.data} /></div>)
}
