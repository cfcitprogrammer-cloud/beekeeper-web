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
        description="Every scheduled and recorded visit. Add visits, then check in and check out with a required camera capture."
        icon={Route}
      />
      <VisitLog visits={result.data ?? []} />
    </div>
  )
}
