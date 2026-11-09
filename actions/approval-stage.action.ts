"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type StageApproverInput = {
  userId?: string
  roleId?: string
}

export type CreateApprovalStageInput = {
  name: string
  description?: string
  requiredApprovals: number
  approvers?: StageApproverInput[]
}

export type UpdateApprovalStageInput = CreateApprovalStageInput & { id: string }

/** Keep only valid approver entries (exactly one of userId / roleId) and dedupe. */
function normalizeApprovers(
  approvers: StageApproverInput[] | undefined
): StageApproverInput[] {
  const seen = new Set<string>()
  const normalized: StageApproverInput[] = []

  for (const approver of approvers ?? []) {
    const userId = approver.userId?.trim() || undefined
    const roleId = approver.roleId?.trim() || undefined
    if ((userId && roleId) || (!userId && !roleId)) continue

    const key = userId ? `user:${userId}` : `role:${roleId}`
    if (seen.has(key)) continue

    seen.add(key)
    normalized.push({ userId, roleId })
  }

  return normalized
}

function approverKey(approver: StageApproverInput): string {
  return approver.userId ? `user:${approver.userId}` : `role:${approver.roleId}`
}

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

  const approvers = normalizeApprovers(input.approvers)
  if (approvers.length > 0) {
    const { error: approverError } = await supabase
      .from("approval_stage_approvers")
      .insert(
        approvers.map((approver) => ({
          company_id: companyId,
          stage_id: data.id,
          user_id: approver.userId ?? null,
          role_id: approver.roleId ?? null,
        }))
      )

    if (approverError) {
      console.error("[action:createApprovalStage:approvers]", approverError)
      // Roll back the stage so we never leave a stage without its approvers.
      await supabase
        .from("approval_stages")
        .delete()
        .eq("id", data.id)
        .eq("company_id", companyId)
      return failure(approverError.message)
    }
  }

  revalidatePath("/approvals/stages")
  revalidatePath("/approvals/templates")
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

  // When the caller supplies a full approver list, sync it (add/remove).
  if (input.approvers) {
    const desired = normalizeApprovers(input.approvers)
    const { data: existing, error: existingError } = await supabase
      .from("approval_stage_approvers")
      .select("id, user_id, role_id")
      .eq("stage_id", input.id)
      .eq("company_id", companyId)

    if (existingError) {
      console.error("[action:updateApprovalStage:approvers]", existingError)
      return failure(existingError.message)
    }

    const desiredKeys = new Set(desired.map(approverKey))
    const existingRows = (existing ?? []) as {
      id: string
      user_id: string | null
      role_id: string | null
    }[]
    const existingKeys = new Set(
      existingRows.map((row) =>
        approverKey({ userId: row.user_id ?? undefined, roleId: row.role_id ?? undefined })
      )
    )

    const toRemove = existingRows.filter(
      (row) =>
        !desiredKeys.has(
          approverKey({ userId: row.user_id ?? undefined, roleId: row.role_id ?? undefined })
        )
    )
    const toAdd = desired.filter((approver) => !existingKeys.has(approverKey(approver)))

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("approval_stage_approvers")
        .delete()
        .in(
          "id",
          toRemove.map((row) => row.id)
        )
        .eq("company_id", companyId)

      if (removeError) {
        console.error("[action:updateApprovalStage:removeApprovers]", removeError)
        return failure(removeError.message)
      }
    }

    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from("approval_stage_approvers")
        .insert(
          toAdd.map((approver) => ({
            company_id: companyId,
            stage_id: input.id,
            user_id: approver.userId ?? null,
            role_id: approver.roleId ?? null,
          }))
        )

      if (addError) {
        console.error("[action:updateApprovalStage:addApprovers]", addError)
        return failure(addError.message)
      }
    }
  }

  revalidatePath("/approvals/stages")
  revalidatePath(`/approvals/stages/${input.id}`)
  revalidatePath("/approvals/templates")
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