import { notFound } from "next/navigation"
import { CalendarClock } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { VisitPlanDetail } from "@/components/visits/visit-plan-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getVisitPlan } from "@/lib/data/operations"

export default async function VisitPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.VISITS_VIEW)
  const planResult = await getVisitPlan(id)
  if (!planResult.data) notFound()
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title={planResult.data.name}
        description="Visit plan details, including every visit scheduled inside the plan's date range."
        icon={CalendarClock}
      />
      <VisitPlanDetail plan={planResult.data} />
    </div>
  )
}
