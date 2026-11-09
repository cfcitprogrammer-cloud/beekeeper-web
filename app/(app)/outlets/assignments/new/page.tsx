import { MapPinned } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { OutletAssignmentForm } from "@/components/outlets/outlet-assignment-form"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployees, getOutlets } from "@/lib/data/queries"

export default async function NewOutletAssignmentPage() {
  await requirePermission(PERMISSIONS.OUTLETS_CREATE)

  const [employeesResult, outletsResult] = await Promise.all([
    getEmployees(),
    getOutlets(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Assign outlets"
        description="Select one employee and the outlets they cover. Active assignments are preserved."
        icon={MapPinned}
      />
      <OutletAssignmentForm
        employees={employeesResult.data}
        outlets={outletsResult.data}
      />
    </div>
  )
}
