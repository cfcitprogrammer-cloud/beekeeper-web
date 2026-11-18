import { Boxes, Warehouse } from "lucide-react"
import Link from "next/link"

import { InventoryStockManager } from "@/components/inventory/inventory-stock-manager"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import {
  getInventoryStock,
  getInventoryWarehouses,
  getSkus,
} from "@/lib/data/queries"

export default async function InventoryStockPage() {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const [stockResult, warehousesResult, skusResult] = await Promise.all([
    getInventoryStock(),
    getInventoryWarehouses(),
    getSkus(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Stock on hand"
        description="On-hand balances per warehouse. Record receipts, issues, adjustments and transfers to keep the ledger accurate."
        icon={Boxes}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/inventory/warehouses" />}
          >
            <Warehouse />
            Warehouses
          </Button>
        }
      />
      <InventoryStockManager
        stock={stockResult.data}
        warehouses={warehousesResult.data}
        skus={skusResult.data}
      />
    </div>
  )
}
