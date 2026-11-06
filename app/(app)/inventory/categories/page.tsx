import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { getSkuCategories } from "@/lib/data/queries"
import { SkuCategoriesManager } from "@/components/inventory/sku-categories-manager"
import { PageHeader } from "@/components/shared/page-header"

export default async function SkuCategoriesPage() {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const result = await getSkuCategories()
  const categories = result.data

  return (
    <>
      <PageHeader
        title="SKU categories"
        description="Organize the product catalog into categories."
      />
      <SkuCategoriesManager categories={categories} />
    </>
  )
}