"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck2, Download, RefreshCw } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { formatDuration, formatTime, humanize } from "@/lib/format"
import { ATTENDANCE_STATUSES, type AttendanceDaily } from "@/types/database"

export function DailySummaryTable({ rows }: { rows: AttendanceDaily[] }) {
  const router = useRouter()
  const dates = React.useMemo(
    () => Array.from(new Set(rows.map((row) => row.work_date))).sort().reverse(),
    [rows]
  )
  const [date, setDate] = React.useState(dates[0] ?? "")
  const [status, setStatus] = React.useState("all")
  const [department, setDepartment] = React.useState("all")
  const [refreshing, setRefreshing] = React.useState(false)

  const departments = Array.from(
    new Set(rows.map((row) => row.department_name).filter(Boolean))
  ) as string[]

  const filtered = React.useMemo(
    () =>
      rows.filter((row) => {
        if (row.work_date !== date) return false
        if (status !== "all" && row.status !== status) return false
        if (department !== "all" && row.department_name !== department) return false
        return true
      }),
    [rows, date, status, department]
  )

  function refresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 700)
  }

  const columns: DataTableColumn<AttendanceDaily>[] = [
    {
      id: "employee",
      header: "Employee",
      sortValue: (row) => row.employee_name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.employee_name}</p>
          <p className="text-[0.625rem] text-muted-foreground">{row.employee_no}</p>
        </div>
      ),
    },
    {
      id: "department",
      header: "Department",
      hideBelow: "md",
      sortValue: (row) => row.department_name ?? "",
      cell: (row) => (
        <span className="text-xs">{row.department_name ?? "Unassigned"}</span>
      ),
    },
    {
      id: "firstIn",
      header: "First in",
      sortValue: (row) => row.first_in ?? "",
      cell: (row) => (
        <span className="text-xs tabular-nums">{formatTime(row.first_in)}</span>
      ),
    },
    {
      id: "lastOut",
      header: "Last out",
      hideBelow: "sm",
      sortValue: (row) => row.last_out ?? "",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.last_out ? formatTime(row.last_out) : "—"}
        </span>
      ),
    },
    {
      id: "hours",
      header: "Hours",
      align: "right",
      sortValue: (row) => row.hours_elapsed,
      cell: (row) => (
        <span className="text-xs tabular-nums">{formatDuration(row.hours_elapsed)}</span>
      ),
    },
    {
      id: "late",
      header: "Late",
      align: "right",
      hideBelow: "lg",
      sortValue: (row) => row.late_minutes,
      cell: (row) =>
        row.late_minutes > 0 ? (
          <span className="text-xs font-medium text-amber-600 tabular-nums dark:text-amber-400">
            {row.late_minutes}m
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "overtime",
      header: "Overtime",
      align: "right",
      hideBelow: "lg",
      sortValue: (row) => row.overtime_minutes,
      cell: (row) =>
        row.overtime_minutes > 0 ? (
          <span className="text-xs font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
            +{row.overtime_minutes}m
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "location",
      header: "Location",
      hideBelow: "xl",
      sortValue: (row) => row.location_name ?? "",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.location_name ?? "—"}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ]

  return (
    <DataTable
      data={filtered}
      columns={columns}
      getRowId={(row) => `${row.employee_id}-${row.work_date}`}
      searchable={(row) =>
        [row.employee_name, row.employee_no, row.department_name, row.location_name]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search employee or department…"
      initialSort={{ id: "employee", desc: false }}
      pageSize={10}
      emptyTitle="No attendance summary for this date"
      emptyDescription="Pick another work date or clear the filters."
      emptyIcon={CalendarCheck2}
      filters={
        <>
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-auto"
            aria-label="Work date"
          />
          <NativeSelect
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All departments</option>
            {departments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {ATTENDANCE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </NativeSelect>
        </>
      }
      toolbar={
        <>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download />
            Export CSV
          </Button>
        </>
      }
    />
  )
}
