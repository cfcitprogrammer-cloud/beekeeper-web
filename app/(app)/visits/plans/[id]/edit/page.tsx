import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { VisitPlanForm } from "@/components/visits/visit-plan-form"
import { PageHeader } from "@/components/shared/page-header"
import { getVisitPlan, getVisits } from "@/lib/data/operations"

export default async function EditVisitPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.VISITS_UPDATE)

  const [planResult, visitsResult] = await Promise.all([
    getVisitPlan(id),
    getVisits(),
  ])
  if (!planResult.data) notFound()

  const plan = planResult.data
  const visits = (visitsResult.data ?? []).filter(
    (visit) => visit.employee_id === plan.employee_id
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Edit visit plan"
        description={`Update ${plan.name}. Visit logs inside the new range are attached when you save.`}
        icon={Pencil}
      />
      <VisitPlanForm
        plan={plan}
        visits={visits}
        employeeId={plan.employee_id}
      />
    </div>
  )
}
