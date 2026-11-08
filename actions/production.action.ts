"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { logActivity } from "@/actions/helpers/activity"
import { PERMISSIONS } from "@/lib/auth/permissions"

const RUN_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const

function runStatus(value?: string) {
  const normalized = String(value ?? "").toLowerCase()
  return (RUN_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as (typeof RUN_STATUSES)[number])
    : "planned"
}

export type CreatePipelineInput = {
  name: string
  code: string
  description?: string
  isActive?: boolean
}

export async function createProductionPipeline(
  input: CreatePipelineInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim() || !input.code.trim()) {
    return failure("Pipeline name and code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const { data, error } = await supabase
    .from("production_pipelines")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createProductionPipeline]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "create",
      entityType: "production_pipeline",
      entityId: data.id,
      summary: `Created production pipeline ${input.name.trim()}`,
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data }
}

export type UpdatePipelineInput = CreatePipelineInput & { id: string }

export async function updateProductionPipeline(
  input: UpdatePipelineInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Pipeline id is required.")
  if (!input.name.trim() || !input.code.trim()) {
    return failure("Pipeline name and code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("production_pipelines")
    .update({
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateProductionPipeline]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "production_pipeline",
      entityId: data.id,
      summary: `Updated production pipeline ${input.name.trim()}`,
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data }
}

export async function deleteProductionPipeline(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Pipeline id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { error } = await supabase
    .from("production_pipelines")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteProductionPipeline]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "delete",
      entityType: "production_pipeline",
      entityId: id,
      summary: "Deleted a production pipeline",
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data: { id } }
}

export type AddStageInput = {
  pipelineId: string
  name: string
  stageType?: string
  inputUom?: string
  outputUom?: string
  description?: string
}

export async function addProductionStage(
  input: AddStageInput
): Promise<ActionResult<{ id: string; sequence: number }>> {
  if (!input.pipelineId) return failure("Select a pipeline.")
  if (!input.name.trim()) return failure("A stage name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const { data: pipeline, error: pipelineError } = await supabase
    .from("production_pipelines")
    .select("id")
    .eq("id", input.pipelineId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (pipelineError) return failure(pipelineError.message)
  if (!pipeline) return failure("Pipeline not found in this company.")

  const { data: lastStage } = await supabase
    .from("production_stages")
    .select("sequence")
    .eq("pipeline_id", input.pipelineId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle()

  const sequence = (lastStage?.sequence ?? 0) + 1

  const { data, error } = await supabase
    .from("production_stages")
    .insert({
      company_id: companyId,
      pipeline_id: input.pipelineId,
      name: input.name.trim(),
      sequence,
      stage_type: input.stageType?.trim() || "processing",
      input_uom: input.inputUom?.trim() || null,
      output_uom: input.outputUom?.trim() || null,
      description: input.description?.trim() || null,
    })
    .select("id, sequence")
    .single()

  if (error) {
    console.error("[action:addProductionStage]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "create",
      entityType: "production_stage",
      entityId: data.id,
      summary: `Added stage ${input.name.trim()} to a pipeline`,
      metadata: { pipeline_id: input.pipelineId, sequence },
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data }
}

export type UpdateStageInput = AddStageInput & { id: string }

export async function updateProductionStage(
  input: UpdateStageInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Stage id is required.")
  if (!input.name.trim()) return failure("A stage name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("production_stages")
    .update({
      name: input.name.trim(),
      stage_type: input.stageType?.trim() || "processing",
      input_uom: input.inputUom?.trim() || null,
      output_uom: input.outputUom?.trim() || null,
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateProductionStage]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "production_stage",
      entityId: data.id,
      summary: `Updated production stage ${input.name.trim()}`,
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data }
}

export async function deleteProductionStage(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Stage id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { error } = await supabase
    .from("production_stages")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteProductionStage]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "delete",
      entityType: "production_stage",
      entityId: id,
      summary: "Deleted a production stage",
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data: { id } }
}

export async function reorderProductionStages(
  pipelineId: string,
  orderedStageIds: string[]
): Promise<ActionResult<{ pipelineId: string }>> {
  if (!pipelineId) return failure("Pipeline id is required.")
  if (orderedStageIds.length === 0) return failure("No stages to reorder.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data: stages, error: stageError } = await supabase
    .from("production_stages")
    .select("id")
    .eq("company_id", companyId)
    .eq("pipeline_id", pipelineId)
  if (stageError) return failure(stageError.message)

  const stageIds = new Set(((stages ?? []) as { id: string }[]).map((stage) => stage.id))
  if (orderedStageIds.some((id) => !stageIds.has(id))) {
    return failure("One or more stages do not belong to this pipeline.")
  }

  // Move to temporary negative sequences first to avoid the unique
  // (pipeline_id, sequence) constraint during the swap.
  for (let index = 0; index < orderedStageIds.length; index += 1) {
    const { error } = await supabase
      .from("production_stages")
      .update({ sequence: -(index + 1), updated_at: new Date().toISOString() })
      .eq("id", orderedStageIds[index])
      .eq("company_id", companyId)
    if (error) return failure(error.message)
  }

  for (let index = 0; index < orderedStageIds.length; index += 1) {
    const { error } = await supabase
      .from("production_stages")
      .update({ sequence: index + 1, updated_at: new Date().toISOString() })
      .eq("id", orderedStageIds[index])
      .eq("company_id", companyId)
    if (error) return failure(error.message)
  }

  revalidatePath("/production")

  return { success: true, data: { pipelineId } }
}

export type CreateProductionRunInput = {
  pipelineId: string
  notes?: string
  status?: string
}

export async function createProductionRun(
  input: CreateProductionRunInput
): Promise<ActionResult<{ id: string; run_no: string }>> {
  if (!input.pipelineId) return failure("Select a pipeline.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const { data: pipeline, error: pipelineError } = await supabase
    .from("production_pipelines")
    .select("id")
    .eq("id", input.pipelineId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (pipelineError) return failure(pipelineError.message)
  if (!pipeline) return failure("Pipeline not found in this company.")

  const { count } = await supabase
    .from("production_runs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)

  const year = new Date().getFullYear()
  const runNo = `PR-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`
  const status = runStatus(input.status)

  const { data, error } = await supabase
    .from("production_runs")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      pipeline_id: input.pipelineId,
      run_no: runNo,
      status,
      started_at: status === "in_progress" ? new Date().toISOString() : null,
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select("id, run_no")
    .single()

  if (error) {
    console.error("[action:createProductionRun]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "create",
      entityType: "production_run",
      entityId: data.id,
      summary: `Created production run ${data.run_no}`,
      metadata: { pipeline_id: input.pipelineId },
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data }
}

export type RecordUsageInput = {
  runId: string
  stageId: string
  inputQuantity: number
  outputQuantity: number
  wasteQuantity?: number
  uom?: string
  notes?: string
}

export async function recordProductionUsage(
  input: RecordUsageInput
): Promise<ActionResult<{ id: string; flowedToStageId: string | null }>> {
  if (!input.runId || !input.stageId) {
    return failure("Select a production run and stage.")
  }
  if (!Number.isFinite(input.inputQuantity) || input.inputQuantity < 0) {
    return failure("Enter a valid input quantity.")
  }
  if (!Number.isFinite(input.outputQuantity) || input.outputQuantity < 0) {
    return failure("Enter a valid output quantity.")
  }
  const waste = input.wasteQuantity ?? 0
  if (!Number.isFinite(waste) || waste < 0) {
    return failure("Enter a valid waste quantity.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  const { data: run, error: runError } = await supabase
    .from("production_runs")
    .select("id, pipeline_id, status, run_no")
    .eq("id", input.runId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (runError) return failure(runError.message)
  if (!run) return failure("Production run not found in this company.")
  if (run.status === "completed" || run.status === "cancelled") {
    return failure("This production run is closed and cannot accept usage.")
  }

  const { data: stage, error: stageError } = await supabase
    .from("production_stages")
    .select("id, name, sequence, pipeline_id, output_uom")
    .eq("id", input.stageId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (stageError) return failure(stageError.message)
  if (!stage) return failure("Production stage not found in this company.")
  if (stage.pipeline_id !== run.pipeline_id) {
    return failure("The selected stage does not belong to the run's pipeline.")
  }

  const now = new Date().toISOString()
  const { data: usage, error } = await supabase
    .from("production_usage")
    .upsert(
      {
        company_id: companyId,
        workspace_id: workspaceId,
        pipeline_id: run.pipeline_id,
        run_id: run.id,
        stage_id: stage.id,
        input_quantity: input.inputQuantity,
        output_quantity: input.outputQuantity,
        waste_quantity: waste,
        uom: input.uom?.trim() || stage.output_uom || null,
        notes: input.notes?.trim() || null,
        recorded_by: userId,
        recorded_at: now,
        updated_at: now,
      },
      { onConflict: "run_id,stage_id" }
    )
    .select("id")
    .single()

  if (error) {
    console.error("[action:recordProductionUsage]", error)
    return failure(error.message)
  }

  if (run.status === "planned") {
    await supabase
      .from("production_runs")
      .update({ status: "in_progress", started_at: now, updated_at: now })
      .eq("id", run.id)
      .eq("company_id", companyId)
  }

  // Flow the output quantity into the next connected stage as its input.
  const { data: nextStage } = await supabase
    .from("production_stages")
    .select("id, name")
    .eq("pipeline_id", run.pipeline_id)
    .eq("company_id", companyId)
    .gt("sequence", stage.sequence)
    .order("sequence", { ascending: true })
    .limit(1)
    .maybeSingle()

  let flowedToStageId: string | null = null
  if (nextStage) {
    flowedToStageId = nextStage.id
    const { data: nextUsage } = await supabase
      .from("production_usage")
      .select("id, output_quantity, waste_quantity")
      .eq("run_id", run.id)
      .eq("stage_id", nextStage.id)
      .maybeSingle()

    if (nextUsage) {
      await supabase
        .from("production_usage")
        .update({
          input_quantity: input.outputQuantity,
          source_stage_id: stage.id,
          updated_at: now,
        })
        .eq("id", nextUsage.id)
    } else {
      await supabase.from("production_usage").insert({
        company_id: companyId,
        workspace_id: workspaceId,
        pipeline_id: run.pipeline_id,
        run_id: run.id,
        stage_id: nextStage.id,
        source_stage_id: stage.id,
        input_quantity: input.outputQuantity,
        output_quantity: 0,
        waste_quantity: 0,
        uom: input.uom?.trim() || stage.output_uom || null,
        notes: `Auto-flowed from ${stage.name}`,
        recorded_by: userId,
        recorded_at: now,
      })
    }
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "usage",
      entityType: "production_run",
      entityId: run.id,
      summary: `Recorded usage at ${stage.name} for ${run.run_no}`,
      metadata: {
        stage_id: stage.id,
        input_quantity: input.inputQuantity,
        output_quantity: input.outputQuantity,
        waste_quantity: waste,
        flowed_to_stage_id: flowedToStageId,
      },
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data: { id: usage.id, flowedToStageId } }
}

export async function updateProductionRunStatus(
  runId: string,
  status: string
): Promise<ActionResult<{ id: string; status: string }>> {
  if (!runId) return failure("Production run id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context
  const normalized = runStatus(status)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("production_runs")
    .update({
      status: normalized,
      started_at: normalized === "in_progress" ? now : undefined,
      completed_at: normalized === "completed" ? now : null,
      updated_at: now,
    })
    .eq("id", runId)
    .eq("company_id", companyId)
    .select("id, status, run_no")
    .single()

  if (error) {
    console.error("[action:updateProductionRunStatus]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "production_run",
      entityId: runId,
      summary: `Marked run ${data.run_no} as ${normalized}`,
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data: { id: data.id, status: data.status } }
}

export async function deleteProductionRun(
  runId: string
): Promise<ActionResult<{ id: string }>> {
  if (!runId) return failure("Production run id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { error } = await supabase
    .from("production_runs")
    .delete()
    .eq("id", runId)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteProductionRun]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "delete",
      entityType: "production_run",
      entityId: runId,
      summary: "Deleted a production run",
    }
  )

  revalidatePath("/production")
  revalidatePath("/feed")

  return { success: true, data: { id: runId } }
}
