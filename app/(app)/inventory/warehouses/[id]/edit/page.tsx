import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { InventoryWarehouseForm } from "@/components/inventory/warehouse-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getInventoryWarehouse } from "@/lib/data/queries"

export default async function EditInventoryWarehousePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.INVENTORY_UPDATE)

  const result = await getInventoryWarehouse(id)
  if (!result.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Edit warehouse"
        description={`Update ${result.data.name} (${result.data.code}).`}
        icon={Pencil}
      />
      <InventoryWarehouseForm warehouse={result.data} />
    </div>
  )
}
