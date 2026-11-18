import { notFound } from "next/navigation"
import { Warehouse } from "lucide-react"

import { WarehouseDetail } from "@/components/inventory/warehouse-detail"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getInventoryWarehouse,
  getInventoryWarehouses,
  getSkus,
  getWarehouseStock,
  getWarehouseStockMovements,
} from "@/lib/data/queries"

export default async function InventoryWarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const [
    warehouseResult,
    stockResult,
    movementsResult,
    warehousesResult,
    skusResult,
  ] = await Promise.all([
    getInventoryWarehouse(id),
    getWarehouseStock(id),
    getWarehouseStockMovements(id),
    getInventoryWarehouses(),
    getSkus(),
  ])

  if (!warehouseResult.data) notFound()

  const warehouse = warehouseResult.data

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title={warehouse.name}
        description={`Warehouse ${warehouse.code}. Track stock on hand and every movement in and out.`}
        icon={Warehouse}
      />
      <WarehouseDetail
        warehouse={warehouse}
        stock={stockResult.data}
        movements={movementsResult.data}
        warehouses={warehousesResult.data}
        skus={skusResult.data}
      />
    </div>
  )
}
