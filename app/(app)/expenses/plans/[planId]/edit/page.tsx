import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ExpensePlanForm } from "@/components/expenses/expense-plan-form"
import { PageHeader } from "@/components/shared/page-header"
import { getExpensePlan } from "@/lib/data/operations"

export default async function EditExpensePlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  await requirePermission(PERMISSIONS.EXPENSES_UPDATE)
  const planResult = await getExpensePlan(planId)
  if (!planResult.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="Edit expense plan" description={`Update ${planResult.data.title}.`} icon={Pencil} /><ExpensePlanForm plan={planResult.data} /></div>)
}
