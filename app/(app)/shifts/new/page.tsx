import { Plus } from "lucide-react"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { ShiftForm } from "@/components/attendance/shift-form"
import { PageHeader } from "@/components/shared/page-header"

export default async function NewShiftPage() {
  await requirePermission(PERMISSIONS.SHIFTS_CREATE)
  return (<div className="space-y-5"><PageHeader eyebrow="Time & attendance" title="New shift" description="Define working hours, break allowance and grace period." icon={Plus} /><ShiftForm /></div>)
}
