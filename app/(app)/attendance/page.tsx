import {
  Clock3,
  Fingerprint,
  ShieldAlert,
  UserCheck,
  UserX,
} from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { AttendanceFeed } from "@/components/attendance/attendance-feed"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getAttendance } from "@/lib/data/queries"

export default async function AttendancePage() {
  const [, attendanceResult] = await Promise.all([
    requirePermission(PERMISSIONS.ATTENDANCE_VIEW),
    getAttendance(),
  ])
  const attendance = attendanceResult.data

  const todayKey = new Date().toISOString().slice(0, 10)
  const today = attendance.filter((row) => row.clock_in_at.startsWith(todayKey))
  const onShift = attendance.filter((row) => !row.clock_out_at)
  const geofenceIssues = attendance.filter((row) => !row.within_geofence)
  const mockLocations = attendance.filter((row) => row.is_mock_location)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Time & attendance"
        title="Attendance live feed"
        description="Monitor clock-ins, geofence validation and mock-location signals across every field location."
        icon={Fingerprint}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Clock-ins today"
          value={today.length}
          hint="Across all locations"
          icon={UserCheck}
          accent="primary"
        />
        <MetricCard
          label="Currently on shift"
          value={onShift.length}
          hint="No clock-out recorded"
          icon={Clock3}
          accent="emerald"
        />
        <MetricCard
          label="Geofence exceptions"
          value={geofenceIssues.length}
          hint="Clocked in outside radius"
          icon={ShieldAlert}
          accent="amber"
        />
        <MetricCard
          label="Mock GPS signals"
          value={mockLocations.length}
          hint="Flagged for investigation"
          icon={UserX}
          accent="rose"
        />
      </div>

      <AttendanceFeed attendance={attendance} />
    </div>
  )
}
