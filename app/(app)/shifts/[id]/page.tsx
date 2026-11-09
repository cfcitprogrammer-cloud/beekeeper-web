import { notFound } from "next/navigation"
import { Clock3 } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ShiftDetail } from "@/components/attendance/shift-detail"
import { PageHeader } from "@/components/shared/page-header"
import { getShift } from "@/lib/data/queries"

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requirePermission(PERMISSIONS.SHIFTS_VIEW)
  const result = await getShift(id)
  if (!result.data) notFound()
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title={result.data.name} description="Shift template details." icon={Clock3} /><ShiftDetail shift={result.data} /></div>)
}
