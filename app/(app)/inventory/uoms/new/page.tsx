import { Plus } from "lucide-react"

import { InventoryUomForm } from "@/components/inventory/uom-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"

export default async function NewInventoryUomPage() {
  await requirePermission(PERMISSIONS.INVENTORY_CREATE)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="New unit of measure"
        description="Add a unit that SKUs can be counted in."
        icon={Plus}
      />
      <InventoryUomForm />
    </div>
  )
}
