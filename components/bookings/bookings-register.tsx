"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, Plus, ShoppingCart, Trash2 } from "lucide-react"

import { createBooking, deleteBooking } from "@/actions/booking.action"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { formatCurrency, formatDate, humanize } from "@/lib/format"
import {
  BOOKING_STATUSES,
  type BookingWithRelations,
  type EmployeeWithRelations,
  type OutletWithRelations,
} from "@/types/database"

const emptyDraft = {
  outlet_id: "",
  employee_id: "",
  booking_date: new Date().toISOString().slice(0, 10),
  notes: "",
}

export function BookingsRegister({
  bookings,
  outlets,
  employees,
}: {
  bookings: BookingWithRelations[]
  outlets: OutletWithRelations[]
  employees: EmployeeWithRelations[]
}) {
  const router = useRouter()
  const [status, setStatus] = React.useState("all")
  const [outletId, setOutletId] = React.useState("all")
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    ...emptyDraft,
    outlet_id: outlets[0]?.id ?? "",
    employee_id: employees[0]?.id ?? "",
  })

  const filtered = React.useMemo(
    () =>
      bookings.filter((booking) => {
        if (status !== "all" && booking.status !== status) return false
        if (outletId !== "all" && booking.outlet_id !== outletId) return false
        return true
      }),
    [bookings, status, outletId]
  )

  async function createBookingHandler() {
    if (!draft.outlet_id || !draft.employee_id) {
      toast.add({
        type: "error",
        title: "Missing details",
        description: "Select an outlet and a field representative.",
      })
      return
    }

    setSaving(true)
    const result = await createBooking({
      outletId: draft.outlet_id,
      employeeId: draft.employee_id,
      bookingDate: draft.booking_date,
      notes: draft.notes,
    })
    setSaving(false)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Could not create booking",
        description: result.error,
      })
      return
    }

    toast.add({
      type: "success",
      title: "Booking created",
      description: `${result.data.booking_no} is ready for line items.`,
    })
    setOpen(false)
    setDraft({
      ...emptyDraft,
      outlet_id: outlets[0]?.id ?? "",
      employee_id: employees[0]?.id ?? "",
    })
    router.refresh()
  }

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
      cell: (row) => (
        <span className="text-xs tabular-nums">{row.line_count}</span>
      ),
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
              deleteBookingHandler(row.id, row.booking_no)
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
    <>
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
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus />
              New booking
            </Button>
          </>
        }
      />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create a field booking"
        description="Start a draft order for an outlet and assign it to a field representative."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createBookingHandler} disabled={saving}>
              <Plus />
              {saving ? "Creating…" : "Create booking"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="booking-outlet">Outlet</Label>
            <NativeSelect
              id="booking-outlet"
              value={draft.outlet_id}
              onChange={(event) => setDraft({ ...draft, outlet_id: event.target.value })}
              className="w-full"
            >
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking-rep">Field representative</Label>
            <NativeSelect
              id="booking-rep"
              value={draft.employee_id}
              onChange={(event) => setDraft({ ...draft, employee_id: event.target.value })}
              className="w-full"
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="booking-date">Booking date</Label>
            <Input
              id="booking-date"
              type="date"
              value={draft.booking_date}
              onChange={(event) => setDraft({ ...draft, booking_date: event.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="booking-notes">Notes</Label>
            <Textarea
              id="booking-notes"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="Order context, delivery instructions or promo details…"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
