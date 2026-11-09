import { Plus } from "lucide-react"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { BookingForm } from "@/components/bookings/booking-form"
import { PageHeader } from "@/components/shared/page-header"
import { getEmployees, getOutlets } from "@/lib/data/queries"

export default async function NewBookingPage() {
  await requirePermission(PERMISSIONS.BOOKINGS_CREATE)

  const [outletsResult, employeesResult] = await Promise.all([
    getOutlets(),
    getEmployees(),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Field operations"
        title="New booking"
        description="Start a draft order for an outlet and assign it to a field representative."
        icon={Plus}
      />
      <BookingForm outlets={outletsResult.data} employees={employeesResult.data} />
    </div>
  )
}
