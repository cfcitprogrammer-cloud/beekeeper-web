import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ExpensePlanForm } from "@/components/expenses/expense-plan-form"
import { PageHeader } from "@/components/shared/page-header"
import { getExpensePlan } from "@/lib/data/operations"
import { getEmployees } from "@/lib/data/queries"

export default async function EditExpensePlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  await requirePermission(PERMISSIONS.EXPENSES_UPDATE)
  const [planResult, employeesResult] = await Promise.all([getExpensePlan(planId), getEmployees()])
  if (!planResult.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Operations" title="Edit expense plan" description={`Update ${planResult.data.title}.`} icon={Pencil} /><ExpensePlanForm plan={planResult.data} employees={employeesResult.data} /></div>)
}
