"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateShiftInput = {
  name: string
  startTime: string
  endTime: string
  breakMinutes?: number
  graceMinutes?: number
}

export async function createShift(
  input: CreateShiftInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim()) return failure("Shift name is required.")
  if (!input.startTime || !input.endTime) {
    return failure("Start and end times are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.SHIFTS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      start_time: input.startTime,
      end_time: input.endTime,
      break_minutes: input.breakMinutes ?? 0,
      grace_minutes: input.graceMinutes ?? 0,
      is_overnight: input.endTime < input.startTime,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createShift]", error)
    return failure(error.message)
  }

  revalidatePath("/shifts")
  revalidatePath("/attendance")

  return { success: true, data }
}
