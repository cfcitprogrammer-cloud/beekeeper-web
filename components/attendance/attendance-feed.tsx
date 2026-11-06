"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Fingerprint,
  MapPinOff,
  RefreshCw,
  ShieldAlert,
  Smartphone,
} from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { GeofenceBadge, StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatDate, formatTime, humanize } from "@/lib/format"
import type { AttendanceWithEmployee } from "@/types/database"

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

function clockInMinutes(iso: string) {
  const time = iso.slice(11, 16)
  return minutesFromTime(time)
}

function attendanceStatus(row: AttendanceWithEmployee) {
  if (!row.shift) return "PRESENT"
  const lateBy =
    clockInMinutes(row.clock_in_at) -
    (minutesFromTime(row.shift.start_time) + 0)
  if (lateBy > 15) return "LATE"
  return "PRESENT"
}

export function AttendanceFeed({ attendance }: { attendance: AttendanceWithEmployee[] }) {
  const router = useRouter()
  const [locationId, setLocationId] = React.useState("all")
  const [source, setSource] = React.useState("all")
  const [flags, setFlags] = React.useState("all")
  const [refreshing, setRefreshing] = React.useState(false)

  const locations = Array.from(
    new Map(
      attendance
        .filter((row) => row.location)
        .map((row) => [row.location!.id, row.location!])
    ).values()
  )

  const filtered = React.useMemo(
    () =>
      attendance.filter((row) => {
        if (locationId !== "all" && row.location_id !== locationId) return false
        if (source !== "all" && row.source !== source) return false
        if (flags === "outside" && row.within_geofence) return false
        if (flags === "mock" && !row.is_mock_location) return false
        if (flags === "open" && row.clock_out_at) return false
        return true
      }),
    [attendance, locationId, source, flags]
  )

  function refresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => {
      setRefreshing(false)
      toast.add({
        type: "success",
        title: "Live feed refreshed",
        description: "Latest clock-ins and geofence checks were pulled.",
      })
    }, 700)
  }

  const columns: DataTableColumn<AttendanceWithEmployee>[] = [
    {
      id: "employee",
      header: "Employee",
      sortValue: (row) => `${row.employee.last_name} ${row.employee.first_name}`,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="flex size-6.5 items-center justify-center rounded-full bg-primary/10 text-[0.5625rem] font-semibold text-primary">
            {row.employee.first_name.charAt(0)}
            {row.employee.last_name.charAt(0)}
          </span>
          <div>
            <p className="text-xs font-medium">
              {row.employee.first_name} {row.employee.last_name}
            </p>
            <p className="text-[0.625rem] text-muted-foreground">
              {row.employee.employee_no}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "clockIn",
      header: "Clock in",
      sortValue: (row) => row.clock_in_at,
      cell: (row) => (
        <div>
          <p className="text-xs tabular-nums">{formatTime(row.clock_in_at)}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {formatDate(row.clock_in_at, { month: "short", day: "numeric" })}
          </p>
        </div>
      ),
    },
    {
      id: "clockOut",
      header: "Clock out",
      hideBelow: "sm",
      sortValue: (row) => row.clock_out_at ?? "",
      cell: (row) =>
        row.clock_out_at ? (
          <span className="text-xs tabular-nums">{formatTime(row.clock_out_at)}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[0.625rem] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            On shift
          </span>
        ),
    },
    {
      id: "location",
      header: "Location",
      hideBelow: "md",
      sortValue: (row) => row.location?.name ?? "",
      cell: (row) => (
        <div>
          <p className="text-xs">{row.location?.name ?? "Unassigned"}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.distance_m}m from centre
          </p>
        </div>
      ),
    },
    {
      id: "shift",
      header: "Shift",
      hideBelow: "lg",
      sortValue: (row) => row.shift?.name ?? "",
      cell: (row) =>
        row.shift ? (
          <div>
            <p className="text-xs">{row.shift.name}</p>
            <p className="text-[0.625rem] text-muted-foreground tabular-nums">
              {row.shift.start_time}–{row.shift.end_time}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "geofence",
      header: "Geofence",
      sortValue: (row) => (row.within_geofence ? 1 : 0),
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <GeofenceBadge within={row.within_geofence} />
          {row.is_mock_location && (
            <span className="inline-flex items-center gap-1 text-[0.5625rem] font-medium text-rose-600 dark:text-rose-400">
              <ShieldAlert className="size-2.5" />
              Mock GPS
            </span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => attendanceStatus(row),
      cell: (row) => <StatusBadge status={attendanceStatus(row)} />,
    },
    {
      id: "source",
      header: "Source",
      hideBelow: "xl",
      sortValue: (row) => row.source,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-[0.625rem] text-muted-foreground">
          <Smartphone className="size-2.5" />
          {humanize(row.source)}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      data={filtered}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.employee.first_name,
          row.employee.last_name,
          row.employee.employee_no,
          row.location?.name,
          row.shift?.name,
          row.source,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search employee, location or shift…"
      initialSort={{ id: "clockIn", desc: true }}
      pageSize={10}
      emptyTitle="No clock-ins match your filters"
      emptyDescription="Try clearing the filters or refresh the live feed."
      emptyIcon={Fingerprint}
      filters={
        <>
          <NativeSelect
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            aria-label="Filter by location"
          >
            <option value="all">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={source}
            onChange={(event) => setSource(event.target.value)}
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            {["MOBILE", "WEB", "BIOMETRIC", "KIOSK"].map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={flags}
            onChange={(event) => setFlags(event.target.value)}
            aria-label="Filter by exceptions"
          >
            <option value="all">All records</option>
            <option value="open">Still on shift</option>
            <option value="outside">Outside geofence</option>
            <option value="mock">Mock GPS</option>
          </NativeSelect>
        </>
      }
      toolbar={
        <>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            Refresh
          </Button>
          <Button size="sm" render={<Link href="/attendance/daily-summary" />}>
            <MapPinOff />
            Daily summary
          </Button>
        </>
      }
    />
  )
}
