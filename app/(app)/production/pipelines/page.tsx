import { Factory } from "lucide-react"

import { ProductionManager } from "@/components/production/production-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getProductionPipelines } from "@/lib/data/operations"

export default async function ProductionPipelinesPage() {
  await requirePermission(PERMISSIONS.PRODUCTION_VIEW)

  const pipelinesResult = await getProductionPipelines()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Production"
        title="Pipelines"
        description="Every production pipeline and the stages it contains."
        icon={Factory}
      />
      <ProductionManager pipelines={pipelinesResult.data} />
    </div>
  )
}
