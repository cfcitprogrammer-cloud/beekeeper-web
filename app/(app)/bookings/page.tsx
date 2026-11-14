import {
  CircleDollarSign,
  ClipboardCheck,
  ShoppingCart,
  Truck,
} from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { BookingsRegister } from "@/components/bookings/bookings-register"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { getBookings, getEmployees, getOutlets } from "@/lib/data/queries"
import { formatCurrency } from "@/lib/format"

export default async function BookingsPage() {
  const [, bookingsResult, outletsResult, employeesResult] = await Promise.all([
    requirePermission(PERMISSIONS.BOOKINGS_VIEW),
    getBookings(),
    getOutlets(),
    getEmployees(),
  ])
  const bookings = bookingsResult.data
  const outlets = outletsResult.data
  const employees = employeesResult.data

  const totalValue = bookings.reduce((sum, booking) => sum + booking.total, 0)
  const pending = bookings.filter((booking) =>
    ["DRAFT", "PENDING_APPROVAL"].includes(booking.status)
  )
  const approved = bookings.filter((booking) => booking.status === "APPROVED")
  const averageOrder = bookings.length ? totalValue / bookings.length : 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="Bookings"
        description="Track field orders from draft through approval and fulfilment, with outlet and rep attribution."
        icon={ShoppingCart}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Bookings"
          value={bookings.length}
          hint={`${outlets.length} outlets covered`}
          icon={ShoppingCart}
          accent="primary"
        />
        <MetricCard
          label="Pipeline value"
          value={formatCurrency(totalValue, true)}
          hint="All booking statuses"
          icon={CircleDollarSign}
          accent="emerald"
        />
        <MetricCard
          label="Awaiting action"
          value={pending.length}
          hint="Draft or pending approval"
          icon={ClipboardCheck}
          accent="amber"
        />
        <MetricCard
          label="Approved"
          value={approved.length}
          hint={`Avg. ${formatCurrency(averageOrder, true)} per order`}
          icon={Truck}
          accent="sky"
        />
      </div>

      <BookingsRegister
        bookings={bookings}
        outlets={outlets}
        employees={employees}
      />
    </div>
  )
}
