"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type ReviewLeaveInput = {
  id: string
  decision: "APPROVED" | "REJECTED"
  notes?: string
}

export async function reviewLeaveRequest(
  input: ReviewLeaveInput
): Promise<ActionResult<{ id: string }>> {
  const authorized = await getAuthorizedContext(PERMISSIONS.LEAVE_REVIEW)
  if ("error" in authorized) return authorized.error

  const { supabase, userId } = authorized.context

  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      status: input.decision.toLowerCase(),
      review_note: input.notes?.trim() || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("id")
    .single()

  if (error) {
    console.error("[action:reviewLeaveRequest]", error)
    return failure(error.message)
  }

  revalidatePath("/leave/requests")
  revalidatePath("/leave/balances")
  revalidatePath("/dashboard")

  return { success: true, data }
}
