import { Building2, MapPin, ShieldCheck, Store } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { OutletsDirectory } from "@/components/outlets/outlets-directory"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getOutlets } from "@/lib/data/queries"

export default async function OutletsPage() {
  await requirePermission(PERMISSIONS.OUTLETS_VIEW)

  const result = await getOutlets()
  const outlets = result.data

  const active = outlets.filter((outlet) => outlet.status === "ACTIVE")
  const pending = outlets.filter((outlet) => outlet.status === "PENDING")
  const averageRadius = outlets.length
    ? Math.round(
        outlets.reduce((sum, outlet) => sum + outlet.geofence_radius_m, 0) /
          outlets.length
      )
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Outlets"
        description="Manage outlet coverage, geofence accuracy and onboarding approvals across territories."
        icon={Store}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total outlets"
          value={outlets.length}
          hint={`${outlets.filter((outlet) => outlet.address).length} with addresses`}
          icon={Building2}
          accent="primary"
        />
        <MetricCard
          label="Active outlets"
          value={active.length}
          hint="Eligible for bookings"
          icon={ShieldCheck}
          accent="emerald"
        />
        <MetricCard
          label="Pending onboarding"
          value={pending.length}
          hint="Awaiting approval"
          icon={Store}
          accent="amber"
        />
        <MetricCard
          label="Avg. geofence"
          value={`${averageRadius}m`}
          hint="Clock-in validation radius"
          icon={MapPin}
          accent="sky"
        />
      </div>

      <OutletsDirectory outlets={outlets} />
    </div>
  )
}
