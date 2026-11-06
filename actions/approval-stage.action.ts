"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateApprovalStageInput = {
  name: string
  description?: string
  requiredApprovals: number
}

export type UpdateApprovalStageInput = CreateApprovalStageInput & { id: string }

export async function createApprovalStage(
  input: CreateApprovalStageInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim()) return failure("Name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("approval_stages")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      required_approvals: input.requiredApprovals || 1,
      is_active: true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createApprovalStage]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/stages")
  return { success: true, data }
}

export async function updateApprovalStage(
  input: UpdateApprovalStageInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Stage id is required.")
  if (!input.name.trim()) return failure("Name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("approval_stages")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      required_approvals: input.requiredApprovals || 1,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateApprovalStage]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/stages")
  return { success: true, data }
}

export async function deleteApprovalStage(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Stage id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("approval_stages")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteApprovalStage]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/stages")
  return { success: true, data: { id } }
}

export async function toggleApprovalStage(
  id: string,
  isActive: boolean
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Stage id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("approval_stages")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:toggleApprovalStage]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/stages")
  return { success: true, data }
}