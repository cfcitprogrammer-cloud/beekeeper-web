import { CalendarPlus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { VisitForm } from "@/components/visits/visit-form"
import { PageHeader } from "@/components/shared/page-header"
import { getOutlets } from "@/lib/data/queries"

export default async function AddVisitPage() {
  await requirePermission(PERMISSIONS.VISITS_CREATE)
  const outletsResult = await getOutlets()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Add visit"
        description="Schedule a visit for an outlet. Check in and check out later from the visit log with a required camera capture."
        icon={CalendarPlus}
      />
      <VisitForm outlets={outletsResult.data ?? []} />
    </div>
  )
}
