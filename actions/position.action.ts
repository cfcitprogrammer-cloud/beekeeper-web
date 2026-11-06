"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreatePositionInput = {
  title: string
  description?: string
  minSalary?: number
  maxSalary?: number
}

export type UpdatePositionInput = CreatePositionInput & { id: string }

export async function createPosition(
  input: CreatePositionInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.title.trim()) return failure("Title is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("positions")
    .insert({
      company_id: companyId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      min_salary: input.minSalary ?? null,
      max_salary: input.maxSalary ?? null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createPosition]", error)
    return failure(error.message)
  }

  revalidatePath("/employees/positions")
  return { success: true, data }
}

export async function updatePosition(
  input: UpdatePositionInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Position id is required.")
  if (!input.title.trim()) return failure("Title is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("positions")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      min_salary: input.minSalary ?? null,
      max_salary: input.maxSalary ?? null,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updatePosition]", error)
    return failure(error.message)
  }

  revalidatePath("/employees/positions")
  return { success: true, data }
}

export async function deletePosition(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Position id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("positions")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deletePosition]", error)
    return failure(error.message)
  }

  revalidatePath("/employees/positions")
  return { success: true, data: { id } }
}