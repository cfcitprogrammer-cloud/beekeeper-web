import { MapPinned, Store, Users } from "lucide-react"

import { OutletAssignmentsManager } from "@/components/outlets/outlet-assignments-manager"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { requirePermission } from "@/lib/auth/guards"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { getOutletAssignments } from "@/lib/data/operations"
import { getEmployees, getOutlets } from "@/lib/data/queries"

export default async function OutletAssignmentsPage() {
  await requirePermission(PERMISSIONS.OUTLETS_VIEW)

  const [assignmentsResult, employeesResult, outletsResult] = await Promise.all([
    getOutletAssignments(),
    getEmployees(),
    getOutlets(),
  ])

  const assignments = assignmentsResult.data
  const active = assignments.filter((assignment) => assignment.is_active)
  const coveredOutlets = new Set(active.map((assignment) => assignment.outlet_id))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Outlet assignments"
        description="Map employees to the outlets they cover. Assignments drive visit planning and operational coverage."
        icon={MapPinned}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Active assignments"
          value={active.length}
          hint="Currently in force"
          icon={MapPinned}
          accent="primary"
        />
        <MetricCard
          label="Covered outlets"
          value={coveredOutlets.size}
          hint={`${outletsResult.data.length} total outlets`}
          icon={Store}
          accent="emerald"
        />
        <MetricCard
          label="Assigned employees"
          value={new Set(active.map((assignment) => assignment.employee_id)).size}
          hint={`${employeesResult.data.length} people in directory`}
          icon={Users}
          accent="sky"
        />
      </div>

      <OutletAssignmentsManager
        assignments={assignments}
        employees={employeesResult.data}
        outlets={outletsResult.data}
      />
    </div>
  )
}
