"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateEmployeeScheduleInput = {
  employeeId: string
  shiftId: string
  daysOfWeek: number[]
  effectiveFrom: string
  effectiveTo?: string
}

export type UpdateEmployeeScheduleInput = CreateEmployeeScheduleInput & { id: string }

export async function createEmployeeSchedule(
  input: CreateEmployeeScheduleInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.employeeId || !input.shiftId) {
    return failure("Employee and shift are required.")
  }
  if (!input.daysOfWeek.length) {
    return failure("Select at least one day of the week.")
  }
  if (!input.effectiveFrom) return failure("Effective from date is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.SHIFTS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("employee_schedules")
    .insert({
      company_id: companyId,
      employee_id: input.employeeId,
      shift_id: input.shiftId,
      days_of_week: input.daysOfWeek,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo || null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createEmployeeSchedule]", error)
    return failure(error.message)
  }

  revalidatePath("/shifts/schedules")
  return { success: true, data }
}

export async function updateEmployeeSchedule(
  input: UpdateEmployeeScheduleInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Schedule id is required.")
  if (!input.employeeId || !input.shiftId) {
    return failure("Employee and shift are required.")
  }
  if (!input.daysOfWeek.length) {
    return failure("Select at least one day of the week.")
  }
  if (!input.effectiveFrom) return failure("Effective from date is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.SHIFTS_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("employee_schedules")
    .update({
      employee_id: input.employeeId,
      shift_id: input.shiftId,
      days_of_week: input.daysOfWeek,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo || null,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateEmployeeSchedule]", error)
    return failure(error.message)
  }

  revalidatePath("/shifts/schedules")
  return { success: true, data }
}

export async function deleteEmployeeSchedule(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Schedule id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.SHIFTS_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("employee_schedules")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteEmployeeSchedule]", error)
    return failure(error.message)
  }

  revalidatePath("/shifts/schedules")
  return { success: true, data: { id } }
}