import { notFound } from "next/navigation"
import { BriefcaseBusiness } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { PositionDetail } from "@/components/employees/position-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getPosition } from "@/lib/data/queries"

export default async function PositionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW)
  const result = await getPosition(id)
  if (!result.data) notFound()
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title={result.data.title} description="Position details." icon={BriefcaseBusiness} />
      <PositionDetail position={result.data} />
    </div>
  )
}
