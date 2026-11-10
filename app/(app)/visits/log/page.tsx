import { Route } from "lucide-react"

import { VisitLog } from "@/components/visits/visit-log"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getVisits } from "@/lib/data/operations"

export default async function VisitLogPage() {
  await requirePermission(PERMISSIONS.VISITS_VIEW)

  const result = await getVisits()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Visit log"
        description="Every recorded visit. Visits are planned when the employee has a plan covering the visit date."
        icon={Route}
      />
      <VisitLog visits={result.data} />
    </div>
  )
}
