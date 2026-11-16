import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { InventoryUomForm } from "@/components/inventory/uom-form"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getInventoryUom } from "@/lib/data/queries"

export default async function EditInventoryUomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.INVENTORY_UPDATE)

  const result = await getInventoryUom(id)
  if (!result.data) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Edit unit of measure"
        description={`Update ${result.data.name} (${result.data.code}).`}
        icon={Pencil}
      />
      <InventoryUomForm uom={result.data} />
    </div>
  )
}
