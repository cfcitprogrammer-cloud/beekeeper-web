import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ShiftForm } from "@/components/attendance/shift-form"
import { PageHeader } from "@/components/shared/page-header"
import { getShift } from "@/lib/data/queries"

export default async function EditShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.SHIFTS_UPDATE)
  const result = await getShift(id)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title="Edit shift" description={`Update ${result.data.name}.`} icon={Pencil} /><ShiftForm shift={result.data} /></div>)
}
