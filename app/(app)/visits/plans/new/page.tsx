import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getAccessContext } from "@/lib/auth/access"
import { VisitPlanForm } from "@/components/visits/visit-plan-form"
import { PageHeader } from "@/components/shared/page-header"
import { getVisits } from "@/lib/data/operations"

export default async function NewVisitPlanPage() {
  await requirePermission(PERMISSIONS.VISITS_CREATE)

  const [access, visitsResult] = await Promise.all([
    getAccessContext(),
    getVisits(),
  ])
  const employeeId = access.employee?.id
  const visits = employeeId
    ? (visitsResult.data ?? []).filter(
        (visit) => visit.employee_id === employeeId
      )
    : []

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="New visit plan"
        description="Reserve a date range for the signed-in employee. Visit logs inside the range are attached when you save."
        icon={Plus}
      />
      <VisitPlanForm visits={visits} employeeId={employeeId} />
    </div>
  )
}
