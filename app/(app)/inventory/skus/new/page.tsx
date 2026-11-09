import { PackagePlus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { SkuForm } from "@/components/inventory/sku-form"
import { PageHeader } from "@/components/shared/page-header"
import { getSkuCategories } from "@/lib/data/queries"

export default async function NewSkuPage() {
  await requirePermission(PERMISSIONS.INVENTORY_CREATE)

  const categoriesResult = await getSkuCategories()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Add SKU"
        description="Create a sellable item for bookings and inventory tracking."
        icon={PackagePlus}
      />
      <SkuForm categories={categoriesResult.data} />
    </div>
  )
}
