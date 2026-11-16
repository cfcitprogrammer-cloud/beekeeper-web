import { Ruler } from "lucide-react"

import { InventoryUomsManager } from "@/components/inventory/uoms-manager"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getInventoryUoms } from "@/lib/data/queries"

export default async function InventoryUomsPage() {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW)

  const result = await getInventoryUoms()

  return (
    <>
      <PageHeader
        eyebrow="Field operations"
        title="Units of measure"
        description="Configure the units used to count SKUs, production usage and deliveries."
        icon={Ruler}
      />
      <InventoryUomsManager uoms={result.data} />
    </>
  )
}
