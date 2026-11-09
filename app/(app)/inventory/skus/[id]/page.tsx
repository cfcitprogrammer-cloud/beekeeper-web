import { notFound } from "next/navigation"
import { Package } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { SkuDetail } from "@/components/inventory/sku-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getSku } from "@/lib/data/queries"

export default async function SkuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const result = await getSku(id)
  if (!result.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title={result.data.name}
        description="SKU details and pricing."
        icon={Package}
      />
      <SkuDetail sku={result.data} />
    </div>
  )
}
