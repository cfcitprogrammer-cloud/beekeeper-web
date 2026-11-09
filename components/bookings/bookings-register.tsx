"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Plus, ShoppingCart, Trash2 } from "lucide-react"

import { deleteBooking } from "@/actions/booking.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
import { toast } from "@/components/ui/toast"
import { formatCurrency, formatDate, humanize } from "@/lib/format"
import {
  BOOKING_STATUSES,
  type BookingWithRelations,
  type EmployeeWithRelations,
  type OutletWithRelations,
} from "@/types/database"

export function BookingsRegister({
  bookings,
  outlets,
}: {
  bookings: BookingWithRelations[]
  outlets: OutletWithRelations[]
  employees: EmployeeWithRelations[]
}) {
  const router = useRouter()
  const [status, setStatus] = React.useState("all")
  const [outletId, setOutletId] = React.useState("all")

  const filtered = React.useMemo(
    () =>
      bookings.filter((booking) => {
        if (status !== "all" && booking.status !== status) return false
        if (outletId !== "all" && booking.outlet_id !== outletId) return false
        return true
      }),
    [bookings, status, outletId]
  )

  const columns: DataTableColumn<BookingWithRelations>[] = [
    {
      id: "booking",
      header: "Booking",
      sortValue: (row) => row.booking_no,
      cell: (row) => (
        <div>
          <p className="font-mono text-[0.6875rem] font-medium">{row.booking_no}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {formatDate(row.booking_date, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Outlet / customer",
      sortValue: (row) => row.outlet.name,
      cell: (row) => (
        <div>
          <p className="text-xs font-medium">{row.outlet.name}</p>
          <p className="text-[0.625rem] text-muted-foreground">
            {row.outlet.address ?? row.outlet.code}
          </p>
        </div>
      ),
    },
    {
      id: "rep",
      header: "Field rep",
      hideBelow: "md",
      sortValue: (row) => row.employee.last_name,
      cell: (row) => (
        <span className="text-xs">
          {row.employee.first_name} {row.employee.last_name}
        </span>
      ),
    },
    {
      id: "lines",
      header: "Lines",
      align: "right",
      hideBelow: "lg",
      sortValue: (row) => row.line_count,
      cell: (row) => <span className="text-xs tabular-nums">{row.line_count}</span>,
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      sortValue: (row) => row.total,
      cell: (row) => (
        <span className="text-xs font-medium tabular-nums">
          {formatCurrency(row.total)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              router.push(`/bookings/${row.id}`)
            }}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              void deleteBookingHandler(row.id, row.booking_no)
            }}
            aria-label="Delete booking"
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  async function deleteBookingHandler(id: string, bookingNo: string) {
    if (!window.confirm(`Delete booking ${bookingNo}? This cannot be undone.`)) return
    const result = await deleteBooking(id)
    if (!result.success) {
      toast.add({ type: "error", title: "Could not delete booking", description: result.error })
      return
    }
    toast.add({ type: "success", title: "Booking deleted", description: `${bookingNo} was removed.` })
    router.refresh()
  }

  return (
    <DataTable
      data={filtered}
      columns={columns}
      getRowId={(row) => row.id}
      searchable={(row) =>
        [
          row.booking_no,
          row.outlet.name,
          row.outlet.address,
          row.employee.first_name,
          row.employee.last_name,
        ]
          .filter(Boolean)
          .join(" ")
      }
      searchPlaceholder="Search booking number, outlet or rep…"
      initialSort={{ id: "booking", desc: true }}
      pageSize={10}
      emptyTitle="No bookings match your filters"
      emptyDescription="Clear the filters or create a new field booking."
      emptyIcon={ShoppingCart}
      onRowClick={(row) => router.push(`/bookings/${row.id}`)}
      filters={
        <>
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {BOOKING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={outletId}
            onChange={(event) => setOutletId(event.target.value)}
            aria-label="Filter by outlet"
          >
            <option value="all">All outlets</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </NativeSelect>
        </>
      }
      toolbar={
        <>
          <Button variant="outline" size="sm">
            <Download />
            Export
          </Button>
          <Button size="sm" render={<Link href="/bookings/new" />}>
            <Plus />
            New booking
          </Button>
        </>
      }
    />
  )
}
