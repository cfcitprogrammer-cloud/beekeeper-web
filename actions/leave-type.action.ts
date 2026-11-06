"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateLeaveTypeInput = {
  name: string
  code: string
  isPaid: boolean
  defaultDaysPerYear: number
  requiresApproval: boolean
  carryOverDays: number
}

export type UpdateLeaveTypeInput = CreateLeaveTypeInput & { id: string }

export async function createLeaveType(
  input: CreateLeaveTypeInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim() || !input.code.trim()) {
    return failure("Name and code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.LEAVE_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("leave_types")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      is_paid: input.isPaid,
      default_days_per_year: input.defaultDaysPerYear,
      requires_approval: input.requiresApproval,
      carry_over_days: input.carryOverDays,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createLeaveType]", error)
    return failure(error.message)
  }

  revalidatePath("/leave/types")
  revalidatePath("/leave/balances")
  return { success: true, data }
}

export async function updateLeaveType(
  input: UpdateLeaveTypeInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Leave type id is required.")
  if (!input.name.trim() || !input.code.trim()) {
    return failure("Name and code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.LEAVE_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("leave_types")
    .update({
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      is_paid: input.isPaid,
      default_days_per_year: input.defaultDaysPerYear,
      requires_approval: input.requiresApproval,
      carry_over_days: input.carryOverDays,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateLeaveType]", error)
    return failure(error.message)
  }

  revalidatePath("/leave/types")
  revalidatePath("/leave/balances")
  return { success: true, data }
}

export async function deleteLeaveType(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Leave type id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.LEAVE_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("leave_types")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteLeaveType]", error)
    return failure(error.message)
  }

  revalidatePath("/leave/types")
  revalidatePath("/leave/balances")
  return { success: true, data: { id } }
}