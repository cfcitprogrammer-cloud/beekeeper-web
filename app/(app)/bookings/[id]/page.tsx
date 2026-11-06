import { notFound } from "next/navigation"

import { PERMISSIONS } from "@/lib/auth/permissions"
import { requirePermission } from "@/lib/auth/guards"
import { BookingDetailView } from "@/components/bookings/booking-detail"
import { getBooking } from "@/lib/data/queries"

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requirePermission(PERMISSIONS.BOOKINGS_VIEW)

  const result = await getBooking(id)

  if (!result.data) {
    notFound()
  }

  return <BookingDetailView booking={result.data} />
}
