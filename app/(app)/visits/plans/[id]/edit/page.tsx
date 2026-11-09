import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { VisitPlanForm } from "@/components/visits/visit-plan-form"
import { PageHeader } from "@/components/shared/page-header"
import { getVisitPlan } from "@/lib/data/operations"
import { getEmployees } from "@/lib/data/queries"

export default async function EditVisitPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.VISITS_UPDATE)
  const [planResult, employeesResult] = await Promise.all([getVisitPlan(id), getEmployees()])
  if (!planResult.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Field operations" title="Edit visit plan" description={`Update ${planResult.data.name}.`} icon={Pencil} /><VisitPlanForm plan={planResult.data} employees={employeesResult.data} /></div>)
}
