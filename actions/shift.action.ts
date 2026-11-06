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

export type UpdateShiftInput = CreateShiftInput & { id: string }

export async function updateShift(
  input: UpdateShiftInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Shift id is required.")
  if (!input.name.trim()) return failure("Shift name is required.")
  if (!input.startTime || !input.endTime) {
    return failure("Start and end times are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.SHIFTS_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("shifts")
    .update({
      name: input.name.trim(),
      start_time: input.startTime,
      end_time: input.endTime,
      break_minutes: input.breakMinutes ?? 0,
      grace_minutes: input.graceMinutes ?? 0,
      is_overnight: input.endTime < input.startTime,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateShift]", error)
    return failure(error.message)
  }

  revalidatePath("/shifts")
  revalidatePath("/attendance")
  return { success: true, data }
}

export async function deleteShift(id: string): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Shift id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.SHIFTS_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteShift]", error)
    return failure(error.message)
  }

  revalidatePath("/shifts")
  revalidatePath("/attendance")
  return { success: true, data: { id } }
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
