"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getActionContext,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions"

export type CreateBookingInput = {
  outletId: string
  employeeId: string
  bookingDate: string
  notes?: string
}

function dbBookingStatus(value: string) {
  switch (value.toUpperCase()) {
    case "PENDING_APPROVAL":
      return "pending_approval"
    case "APPROVED":
      return "approved"
    case "REJECTED":
      return "rejected"
    case "CANCELLED":
      return "cancelled"
    default:
      return "draft"
  }
}

export async function createBooking(
  input: CreateBookingInput
): Promise<ActionResult<{ id: string; booking_no: string }>> {
  if (!input.outletId || !input.employeeId) {
    return failure("Select an outlet and a field representative.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.BOOKINGS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  if (!workspaceId) {
    return failure(
      "No workspace is associated with your account. Ask an administrator to assign one."
    )
  }

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)

  const year = new Date(input.bookingDate || Date.now()).getFullYear()
  const bookingNo = `BK-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      outlet_id: input.outletId,
      employee_id: input.employeeId,
      booking_no: bookingNo,
      booking_date: input.bookingDate,
      notes: input.notes?.trim() || null,
      status: "draft",
      line_count: 0,
      subtotal: 0,
      discount_total: 0,
      tax_total: 0,
      total: 0,
    })
    .select("id, booking_no")
    .single()

  if (error) {
    console.error("[action:createBooking]", error)
    return failure(error.message)
  }

  revalidatePath("/bookings")
  revalidatePath("/dashboard")

  return { success: true, data }
}

export type UpdateBookingStatusInput = {
  id: string
  status: string
}

export async function updateBookingStatus(
  input: UpdateBookingStatusInput
): Promise<ActionResult<{ id: string }>> {
  const status = dbBookingStatus(input.status)
  const context = await getActionContext()

  if (!context.userId) {
    return failure("You must be signed in to update a booking.")
  }

  const requiredPermission =
    status === "approved" || status === "rejected"
      ? PERMISSIONS.APPROVALS_DECIDE
      : PERMISSIONS.BOOKINGS_UPDATE

  if (!hasPermission(context.permissions, requiredPermission)) {
    return failure("You do not have permission to perform this action.")
  }

  if (!context.companyId) {
    return failure("No company is associated with your account.")
  }

  const { supabase } = context

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status,
      submitted_at:
        status === "pending_approval" ? new Date().toISOString() : undefined,
      approved_at: status === "approved" ? new Date().toISOString() : undefined,
    })
    .eq("id", input.id)
    .eq("company_id", context.companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateBookingStatus]", error)
    return failure(error.message)
  }

  revalidatePath("/bookings")
  revalidatePath(`/bookings/${input.id}`)
  revalidatePath("/dashboard")

  return { success: true, data }
}
