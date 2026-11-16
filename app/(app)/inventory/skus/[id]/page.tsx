import { notFound } from "next/navigation"
import { Package } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { SkuDetail } from "@/components/inventory/sku-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getInventoryUoms, getSku } from "@/lib/data/queries"

export default async function SkuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const [result, uomsResult] = await Promise.all([
    getSku(id),
    getInventoryUoms(),
  ])
  if (!result.data) notFound()

  const sku = result.data
  const unit = sku.uom_id
    ? uomsResult.data.find((uom) => uom.id === sku.uom_id)
    : uomsResult.data.find((uom) => uom.code === sku.uom)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title={sku.name}
        description="SKU details and pricing."
        icon={Package}
      />
      <SkuDetail
        sku={sku}
        uomLabel={unit ? `${unit.name} (${unit.code})` : null}
      />
    </div>
  )
}
