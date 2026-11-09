import { Plus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { SkuCategoryForm } from "@/components/inventory/sku-category-form"
import { PageHeader } from "@/components/shared/page-header"
import { getSkuCategories } from "@/lib/data/queries"

export default async function NewSkuCategoryPage() {
  await requirePermission(PERMISSIONS.INVENTORY_CREATE)

  const result = await getSkuCategories()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="New category"
        description="Organize SKUs into categories."
        icon={Plus}
      />
      <SkuCategoryForm categories={result.data} />
    </div>
  )
}
