import { Warehouse } from "lucide-react"

import { InventoryWarehousesManager } from "@/components/inventory/warehouses-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getInventoryWarehouses } from "@/lib/data/queries"

export default async function InventoryWarehousesPage() {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const result = await getInventoryWarehouses()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Warehouses"
        description="Maintain the warehouse directory used to label inventory items and their production warehouse."
        icon={Warehouse}
      />
      <InventoryWarehousesManager warehouses={result.data} />
    </div>
  )
}
