"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

// ---------------------------------------------------------------------------
// Template stages (linking an approval stage into a template with a sequence)
// ---------------------------------------------------------------------------
export type AddTemplateStageInput = {
  templateId: string
  stageId: string
  seq: number
}

export async function addTemplateStage(
  input: AddTemplateStageInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.templateId || !input.stageId) {
    return failure("Template and stage are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("approval_template_stages")
    .insert({
      company_id: companyId,
      template_id: input.templateId,
      stage_id: input.stageId,
      seq: input.seq,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:addTemplateStage]", error)
    return failure(error.message)
  }

  revalidatePath(`/approvals/templates/${input.templateId}`)
  revalidatePath("/approvals/templates")
  return { success: true, data }
}

export async function removeTemplateStage(
  id: string,
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Template stage id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("approval_template_stages")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:removeTemplateStage]", error)
    return failure(error.message)
  }

  revalidatePath(`/approvals/templates/${templateId}`)
  revalidatePath("/approvals/templates")
  return { success: true, data: { id } }
}

// ---------------------------------------------------------------------------
// Stage approvers (assign a user or role to an approval stage)
// ---------------------------------------------------------------------------
export type AddStageApproverInput = {
  stageId: string
  userId?: string
  roleId?: string
}

export async function addStageApprover(
  input: AddStageApproverInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.stageId) return failure("Stage is required.")
  if (!input.userId && !input.roleId) {
    return failure("Select a user or a role.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("approval_stage_approvers")
    .insert({
      company_id: companyId,
      stage_id: input.stageId,
      user_id: input.userId || null,
      role_id: input.roleId || null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:addStageApprover]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/stages")
  revalidatePath("/approvals/templates")
  return { success: true, data }
}

export async function removeStageApprover(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Approver id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("approval_stage_approvers")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:removeStageApprover]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/stages")
  revalidatePath("/approvals/templates")
  return { success: true, data: { id } }
}

// ---------------------------------------------------------------------------
// Template conditions
// ---------------------------------------------------------------------------
export type AddTemplateConditionInput = {
  templateId: string
  field: string
  operator: "=" | "<>" | ">" | ">=" | "<" | "<="
  valueNumeric?: number
  valueText?: string
}

export async function addTemplateCondition(
  input: AddTemplateConditionInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.templateId || !input.field.trim()) {
    return failure("Template and field are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("approval_template_conditions")
    .insert({
      company_id: companyId,
      template_id: input.templateId,
      field: input.field.trim(),
      operator: input.operator,
      value_numeric: input.valueNumeric ?? null,
      value_text: input.valueText?.trim() || null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:addTemplateCondition]", error)
    return failure(error.message)
  }

  revalidatePath(`/approvals/templates/${input.templateId}`)
  revalidatePath("/approvals/templates")
  return { success: true, data }
}

export async function removeTemplateCondition(
  id: string,
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Condition id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("approval_template_conditions")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:removeTemplateCondition]", error)
    return failure(error.message)
  }

  revalidatePath(`/approvals/templates/${templateId}`)
  revalidatePath("/approvals/templates")
  return { success: true, data: { id } }
}

// ---------------------------------------------------------------------------
// Template originators
// ---------------------------------------------------------------------------
export type AddTemplateOriginatorInput = {
  templateId: string
  userId: string
}

export async function addTemplateOriginator(
  input: AddTemplateOriginatorInput
): Promise<ActionResult<{ templateId: string }>> {
  if (!input.templateId || !input.userId) {
    return failure("Template and user are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("approval_template_originators")
    .insert({
      template_id: input.templateId,
      user_id: input.userId,
      company_id: companyId,
    })

  if (error) {
    console.error("[action:addTemplateOriginator]", error)
    return failure(error.message)
  }

  revalidatePath(`/approvals/templates/${input.templateId}`)
  revalidatePath("/approvals/templates")
  return { success: true, data: { templateId: input.templateId } }
}

export async function removeTemplateOriginator(
  templateId: string,
  userId: string
): Promise<ActionResult<{ templateId: string }>> {
  if (!templateId || !userId) return failure("Template and user are required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("approval_template_originators")
    .delete()
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:removeTemplateOriginator]", error)
    return failure(error.message)
  }

  revalidatePath(`/approvals/templates/${templateId}`)
  revalidatePath("/approvals/templates")
  return { success: true, data: { templateId } }
}