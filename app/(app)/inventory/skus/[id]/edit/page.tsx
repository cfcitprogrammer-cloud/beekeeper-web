import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { SkuForm } from "@/components/inventory/sku-form"
import { SkuComponentsManager } from "@/components/inventory/sku-components-manager"
import { PageHeader } from "@/components/shared/page-header"
import {
  getInventoryUoms,
  getInventoryWarehouses,
  getSku,
  getSkuCategories,
  getSkuComponents,
  getSkus,
} from "@/lib/data/queries"

export default async function EditSkuPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.INVENTORY_UPDATE)

  const [skuResult, categoriesResult, uomsResult, warehousesResult, componentsResult, skusResult] = await Promise.all([
    getSku(id),
    getSkuCategories(),
    getInventoryUoms(),
    getInventoryWarehouses(),
    getSkuComponents(id),
    getSkus(),
  ])
  if (!skuResult.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Edit SKU"
        description={`Update details for ${skuResult.data.name}.`}
        icon={Pencil}
      />
      <SkuForm
        sku={skuResult.data}
        categories={categoriesResult.data}
        uoms={uomsResult.data}
        warehouses={warehousesResult.data}
      />
      <SkuComponentsManager
        parentId={id}
        skus={skusResult.data}
        initialComponents={componentsResult.data}
      />
    </div>
  )
}
