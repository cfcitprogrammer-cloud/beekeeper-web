import { CalendarClock } from "lucide-react"

import { VisitPlansManager } from "@/components/visits/visit-plans-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getVisitPlans } from "@/lib/data/operations"

export default async function VisitPlansPage() {
  await requirePermission(PERMISSIONS.VISITS_VIEW)

  const result = await getVisitPlans()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Visit plans"
        description="A visit plan reserves a date range for an employee. Visits inside the range are attached only when the plan is saved."
        icon={CalendarClock}
      />
      <VisitPlansManager plans={result.data ?? []} />
    </div>
  )
}
