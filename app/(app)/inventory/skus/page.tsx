import { Boxes, Package, PackageCheck, Tags } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { SkuCatalog } from "@/components/inventory/sku-catalog"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getSkuCategories, getSkus } from "@/lib/data/queries"
import { formatCurrency } from "@/lib/format"

export default async function SkuCatalogPage() {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const [skusResult, categoriesResult] = await Promise.all([
    getSkus(),
    getSkuCategories(),
  ])
  const skus = skusResult.data
  const categories = categoriesResult.data

  const active = skus.filter((sku) => sku.is_active)
  const averagePrice = skus.length
    ? skus.reduce((sum, sku) => sum + sku.unit_price, 0) / skus.length
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="SKU catalog"
        description="Maintain the product catalog, pricing and tax configuration used by field bookings."
        icon={Package}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total SKUs"
          value={skus.length}
          hint={`${categories.length} product categories`}
          icon={Boxes}
          accent="primary"
        />
        <MetricCard
          label="Active SKUs"
          value={active.length}
          hint="Available for booking"
          icon={PackageCheck}
          accent="emerald"
        />
        <MetricCard
          label="Categories"
          value={categories.length}
          hint="Beverages, snacks and more"
          icon={Tags}
          accent="sky"
        />
        <MetricCard
          label="Average price"
          value={formatCurrency(averagePrice, true)}
          hint="Across the catalog"
          icon={Package}
          accent="violet"
        />
      </div>

      <SkuCatalog skus={skus} categories={categories} />
    </div>
  )
}
