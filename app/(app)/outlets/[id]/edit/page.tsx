import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { OutletForm } from "@/components/outlets/outlet-form"
import { PageHeader } from "@/components/shared/page-header"
import { getOutlet, getOutlets } from "@/lib/data/queries"

export default async function EditOutletPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.OUTLETS_UPDATE)

  const [outletResult, outletsResult] = await Promise.all([
    getOutlet(id),
    getOutlets(),
  ])

  if (!outletResult.data) {
    notFound()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Edit outlet"
        description={`Update details for ${outletResult.data.name}.`}
        icon={Pencil}
      />
      <OutletForm outlet={outletResult.data} outlets={outletsResult.data} />
    </div>
  )
}
