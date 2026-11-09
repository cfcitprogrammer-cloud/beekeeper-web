import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { PositionForm } from "@/components/employees/position-form"
import { PageHeader } from "@/components/shared/page-header"
import { getPosition } from "@/lib/data/queries"

export default async function EditPositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  const result = await getPosition(id)
  if (!result.data) notFound()
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title="Edit position" description={`Update ${result.data.title}.`} icon={Pencil} />
      <PositionForm position={result.data} />
    </div>
  )
}
