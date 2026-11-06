"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateDepartmentInput = {
  name: string
  code?: string
  parentId?: string
}

export type UpdateDepartmentInput = CreateDepartmentInput & { id: string }

export async function createDepartment(
  input: CreateDepartmentInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim()) return failure("Name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("departments")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      parent_id: input.parentId || null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createDepartment]", error)
    return failure(error.message)
  }

  revalidatePath("/employees/departments")
  return { success: true, data }
}

export async function updateDepartment(
  input: UpdateDepartmentInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Department id is required.")
  if (!input.name.trim()) return failure("Name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("departments")
    .update({
      name: input.name.trim(),
      code: input.code?.trim() || null,
      parent_id: input.parentId || null,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateDepartment]", error)
    return failure(error.message)
  }

  revalidatePath("/employees/departments")
  return { success: true, data }
}

export async function deleteDepartment(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Department id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteDepartment]", error)
    return failure(error.message)
  }

  revalidatePath("/employees/departments")
  return { success: true, data: { id } }
}