import { Plus } from "lucide-react"

import { InventoryWarehouseForm } from "@/components/inventory/warehouse-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"

export default async function NewInventoryWarehousePage() {
  await requirePermission(PERMISSIONS.INVENTORY_CREATE)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="New warehouse"
        description="Add a warehouse that SKUs can be labelled with."
        icon={Plus}
      />
      <InventoryWarehouseForm />
    </div>
  )
}
