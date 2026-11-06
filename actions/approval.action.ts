"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type DecideApprovalInput = {
  requestStageId: string
  requestId: string
  decision: "APPROVED" | "REJECTED"
  remarks?: string
  documentType: "BOOKING" | "OUTLET"
  documentId: string
}

function dbDecision(value: DecideApprovalInput["decision"]) {
  return value === "APPROVED" ? "approved" : "rejected"
}

function revalidateApprovalSurfaces(
  documentType: DecideApprovalInput["documentType"],
  documentId: string
) {
  revalidatePath("/approvals/inbox")
  revalidatePath("/dashboard")
  revalidatePath(documentType === "BOOKING" ? "/bookings" : "/outlets")
  if (documentType === "BOOKING") {
    revalidatePath(`/bookings/${documentId}`)
  }
}

export async function decideApproval(
  input: DecideApprovalInput
): Promise<ActionResult<{ requestId: string }>> {
  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_DECIDE)
  if ("error" in authorized) return authorized.error

  const { supabase, userId, companyId } = authorized.context

  const { data: pendingStage, error: pendingError } = await supabase
    .from("my_pending_approvals")
    .select("request_stage_id, request_id, document_type, document_id")
    .eq("request_stage_id", input.requestStageId)
    .maybeSingle()

  if (pendingError || !pendingStage) {
    return failure(
      "This approval is not assigned to you or has already been decided."
    )
  }

  const { data: stage, error: stageError } = await supabase
    .from("approval_request_stages")
    .select("*")
    .eq("id", input.requestStageId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (stageError || !stage) {
    console.error("[action:decideApproval:stage]", stageError)
    return failure(stageError?.message ?? "Approval stage not found.")
  }

  const { data: request, error: requestError } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", input.requestId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (requestError || !request) {
    console.error("[action:decideApproval:request]", requestError)
    return failure(requestError?.message ?? "Approval request not found.")
  }

  const { error: decisionError } = await supabase
    .from("approval_decisions")
    .insert({
      company_id: stage.company_id,
      request_id: input.requestId,
      request_stage_id: input.requestStageId,
      decided_by: userId,
      decision: dbDecision(input.decision),
      remarks: input.remarks?.trim() || null,
    })

  if (decisionError) {
    console.error("[action:decideApproval:decision]", decisionError)
    return failure(decisionError.message)
  }

  const now = new Date().toISOString()
  const rejected = input.decision === "REJECTED"

  if (rejected) {
    await supabase
      .from("approval_request_stages")
      .update({ status: "rejected", completed_at: now })
      .eq("id", input.requestStageId)

    await supabase
      .from("approval_requests")
      .update({ status: "rejected", completed_at: now })
      .eq("id", input.requestId)
  } else {
    const { count } = await supabase
      .from("approval_decisions")
      .select("id", { count: "exact", head: true })
      .eq("request_stage_id", input.requestStageId)
      .eq("decision", "approved")

    const approvalsReceived = count ?? 1
    const stageComplete = approvalsReceived >= stage.required_approvals

    if (stageComplete) {
      await supabase
        .from("approval_request_stages")
        .update({ status: "approved", completed_at: now })
        .eq("id", input.requestStageId)

      const { data: nextStage } = await supabase
        .from("approval_request_stages")
        .select("id")
        .eq("request_id", input.requestId)
        .gt("seq", stage.seq)
        .order("seq")
        .limit(1)
        .maybeSingle()

      if (nextStage) {
        await supabase
          .from("approval_request_stages")
          .update({ status: "pending" })
          .eq("id", nextStage.id)
      } else {
        await supabase
          .from("approval_requests")
          .update({ status: "approved", completed_at: now })
          .eq("id", input.requestId)
      }
    } else {
      await supabase
        .from("approval_request_stages")
        .update({ status: "pending" })
        .eq("id", input.requestStageId)
    }
  }

  const finalStatus = rejected ? "rejected" : "approved"

  if (rejected) {
    if (input.documentType === "BOOKING") {
      await supabase
        .from("bookings")
        .update({ status: finalStatus })
        .eq("id", input.documentId)
    } else {
      await supabase
        .from("outlets")
        .update({ status: finalStatus, is_active: false })
        .eq("id", input.documentId)
    }
  } else {
    const { data: siblingStages } = await supabase
      .from("approval_request_stages")
      .select("status")
      .eq("request_id", input.requestId)

    const allApproved =
      (siblingStages ?? []).length > 0 &&
      (siblingStages ?? []).every((row) => row.status === "approved")

    if (allApproved) {
      if (input.documentType === "BOOKING") {
        await supabase
          .from("bookings")
          .update({ status: "approved", approved_at: now })
          .eq("id", input.documentId)
      } else {
        await supabase
          .from("outlets")
          .update({ status: "approved", is_active: true, approved_at: now })
          .eq("id", input.documentId)
      }
    }
  }

  revalidateApprovalSurfaces(input.documentType, input.documentId)

  return { success: true, data: { requestId: input.requestId } }
}

export type UpdateApprovalTemplateInput = {
  id: string
  name: string
  description?: string
  documentType: "BOOKING" | "OUTLET"
}

export async function updateApprovalTemplate(
  input: UpdateApprovalTemplateInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Template id is required.")
  if (!input.name.trim()) return failure("Template name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("approval_templates")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      document_type: input.documentType.toLowerCase(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateApprovalTemplate]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/templates")
  return { success: true, data }
}

export async function deleteApprovalTemplate(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Template id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("approval_templates")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteApprovalTemplate]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/templates")
  return { success: true, data: { id } }
}

export async function toggleApprovalTemplate(input: {
  id: string
  isActive: boolean
}): Promise<ActionResult<{ id: string }>> {
  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("approval_templates")
    .update({ is_active: input.isActive })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:toggleApprovalTemplate]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/templates")
  return { success: true, data }
}

export type CreateApprovalTemplateInput = {
  name: string
  description?: string
  documentType: "BOOKING" | "OUTLET"
}

export async function createApprovalTemplate(
  input: CreateApprovalTemplateInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim()) return failure("Template name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("approval_templates")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      document_type: input.documentType.toLowerCase(),
      is_active: false,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createApprovalTemplate]", error)
    return failure(error.message)
  }

  revalidatePath("/approvals/templates")
  return { success: true, data }
}

export async function duplicateApprovalTemplate(input: {
  id: string
}): Promise<ActionResult<{ id: string }>> {
  const authorized = await getAuthorizedContext(PERMISSIONS.APPROVALS_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data: template, error: templateError } = await supabase
    .from("approval_templates")
    .select("*")
    .eq("id", input.id)
    .eq("company_id", companyId)
    .maybeSingle()

  if (templateError || !template) {
    return failure(templateError?.message ?? "Template not found.")
  }

  const { data: copy, error: copyError } = await supabase
    .from("approval_templates")
    .insert({
      company_id: template.company_id,
      workspace_id: template.workspace_id,
      name: `${template.name} (copy)`,
      description: template.description,
      document_type: template.document_type,
      is_active: false,
    })
    .select("id")
    .single()

  if (copyError || !copy) {
    console.error("[action:duplicateApprovalTemplate:copy]", copyError)
    return failure(copyError?.message ?? "Could not duplicate the template.")
  }

  const [stagesResult, conditionsResult] = await Promise.all([
    supabase
      .from("approval_template_stages")
      .select("*")
      .eq("template_id", template.id),
    supabase
      .from("approval_template_conditions")
      .select("*")
      .eq("template_id", template.id),
  ])

  const stages = (stagesResult.data ?? []) as {
    stage_id: string
    seq: number
  }[]

  if (stages.length > 0) {
    await supabase.from("approval_template_stages").insert(
      stages.map((stage) => ({
        company_id: template.company_id,
        template_id: copy.id,
        stage_id: stage.stage_id,
        seq: stage.seq,
      }))
    )
  }

  const conditions = (conditionsResult.data ?? []) as {
    field: string
    operator: string
    value_numeric: number | null
    value_text: string | null
  }[]

  if (conditions.length > 0) {
    await supabase.from("approval_template_conditions").insert(
      conditions.map((condition) => ({
        company_id: template.company_id,
        template_id: copy.id,
        field: condition.field,
        operator: condition.operator,
        value_numeric: condition.value_numeric,
        value_text: condition.value_text,
      }))
    )
  }

  revalidatePath("/approvals/templates")
  return { success: true, data: copy }
}
