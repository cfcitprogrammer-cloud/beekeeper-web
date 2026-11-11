import { notFound } from "next/navigation"
import { Tags } from "lucide-react"

import { StageAssignmentForm } from "@/components/production/stage-assignment-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionStage } from "@/lib/data/operations"
import { getSkus } from "@/lib/data/queries"

export default async function StageAssignmentPage({
  params,
}: {
  params: Promise<{ stageId: string }>
}) {
  await requirePermission(PERMISSIONS.PRODUCTION_UPDATE)

  const { stageId } = await params
  const [stageResult, skusResult] = await Promise.all([
    getProductionStage(stageId),
    getSkus(),
  ])

  if (!stageResult.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Assign stage SKUs"
        description={`Choose which SKUs ${stageResult.data.name} can consume or produce.`}
        icon={Tags}
      />
      <StageAssignmentForm stage={stageResult.data} skus={skusResult.data} />
    </div>
  )
}
