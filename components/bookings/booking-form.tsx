"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"

import { createBooking } from "@/actions/booking.action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import type { EmployeeWithRelations, OutletWithRelations } from "@/types/database"

export function BookingForm({
  outlets,
  employees,
}: {
  outlets: OutletWithRelations[]
  employees: EmployeeWithRelations[]
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [draft, setDraft] = React.useState({
    outlet_id: outlets[0]?.id ?? "",
    employee_id: employees[0]?.id ?? "",
    booking_date: new Date().toISOString().slice(0, 10),
    notes: "",
  })

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
    router.push(`/bookings/${result.data.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.push("/bookings")}>
        <ArrowLeft />
        Back to bookings
      </Button>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
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

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => router.push("/bookings")} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={createBookingHandler} disabled={saving}>
            <Plus />
            {saving ? "Creating…" : "Create booking"}
          </Button>
        </div>
      </div>
    </div>
  )
}
