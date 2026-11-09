import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { SkuCategoryForm } from "@/components/inventory/sku-category-form"
import { PageHeader } from "@/components/shared/page-header"
import { getSkuCategories, getSkuCategory } from "@/lib/data/queries"

export default async function EditSkuCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.INVENTORY_UPDATE)

  const [categoryResult, categoriesResult] = await Promise.all([
    getSkuCategory(id),
    getSkuCategories(),
  ])
  if (!categoryResult.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Edit category"
        description={`Update ${categoryResult.data.name}.`}
        icon={Pencil}
      />
      <SkuCategoryForm category={categoryResult.data} categories={categoriesResult.data} />
    </div>
  )
}
