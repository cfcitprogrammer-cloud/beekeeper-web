import { notFound } from "next/navigation"
import { Store } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { OutletDetail } from "@/components/outlets/outlet-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getOutlet, getOutlets } from "@/lib/data/queries"

export default async function OutletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.OUTLETS_VIEW)

  const [outletResult, outletsResult] = await Promise.all([
    getOutlet(id),
    getOutlets(),
  ])

  if (!outletResult.data) {
    notFound()
  }

  const distributorName = outletResult.data.distributor_id
    ? outletsResult.data.find((o) => o.id === outletResult.data!.distributor_id)
        ?.name ?? null
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title={outletResult.data.name}
        description="Outlet details and coverage information."
        icon={Store}
      />
      <OutletDetail outlet={outletResult.data} distributorName={distributorName} />
    </div>
  )
}
