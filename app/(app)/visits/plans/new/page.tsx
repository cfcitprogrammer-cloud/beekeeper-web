import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { VisitPlanForm } from "@/components/visits/visit-plan-form"
import { PageHeader } from "@/components/shared/page-header"

export default async function NewVisitPlanPage() {
  await requirePermission(PERMISSIONS.VISITS_CREATE)
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="New visit plan"
        description="Reserve a date range for the signed-in employee. No target outlets are required."
        icon={Plus}
      />
      <VisitPlanForm />
    </div>
  )
}
