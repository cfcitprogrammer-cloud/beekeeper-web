"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateHolidayInput = {
  name: string
  holidayDate: string
  type: "REGULAR" | "SPECIAL" | "LOCAL"
  workspaceId?: string
}

function dbHolidayType(value: CreateHolidayInput["type"]) {
  switch (value) {
    case "REGULAR":
      return "regular"
    case "SPECIAL":
      return "special"
    default:
      return "company"
  }
}

export type UpdateHolidayInput = CreateHolidayInput & { id: string }

export async function createHoliday(
  input: CreateHolidayInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim() || !input.holidayDate) {
    return failure("Name and date are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.ATTENDANCE_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("holidays")
    .insert({
      company_id: companyId,
      workspace_id: input.workspaceId || null,
      holiday_date: input.holidayDate,
      name: input.name.trim(),
      type: dbHolidayType(input.type),
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createHoliday]", error)
    return failure(error.message)
  }

  revalidatePath("/attendance/holidays")
  return { success: true, data }
}

export async function updateHoliday(
  input: UpdateHolidayInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Holiday id is required.")
  if (!input.name.trim() || !input.holidayDate) {
    return failure("Name and date are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.ATTENDANCE_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("holidays")
    .update({
      workspace_id: input.workspaceId || null,
      holiday_date: input.holidayDate,
      name: input.name.trim(),
      type: dbHolidayType(input.type),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateHoliday]", error)
    return failure(error.message)
  }

  revalidatePath("/attendance/holidays")
  return { success: true, data }
}

export async function deleteHoliday(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Holiday id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ATTENDANCE_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteHoliday]", error)
    return failure(error.message)
  }

  revalidatePath("/attendance/holidays")
  return { success: true, data: { id } }
}