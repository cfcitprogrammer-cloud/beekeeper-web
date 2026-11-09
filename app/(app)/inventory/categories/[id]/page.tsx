import { notFound } from "next/navigation"
import { Package } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { SkuCategoryDetail } from "@/components/inventory/sku-category-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getSkuCategories, getSkuCategory } from "@/lib/data/queries"

export default async function SkuCategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const [categoryResult, categoriesResult] = await Promise.all([
    getSkuCategory(id),
    getSkuCategories(),
  ])
  if (!categoryResult.data) notFound()

  const parentName = categoryResult.data.parent_id
    ? categoriesResult.data.find((c) => c.id === categoryResult.data!.parent_id)?.name ?? null
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title={categoryResult.data.name}
        description="Category details."
        icon={Package}
      />
      <SkuCategoryDetail category={categoryResult.data} parentName={parentName} />
    </div>
  )
}
