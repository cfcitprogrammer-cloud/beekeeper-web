"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  getAuthorizedContextAny,
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

  const { data, error } = await supabase
    .from("production_runs")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      pipeline_id: input.pipelineId,
      run_no: runNo,
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

export type AssignStageSkusInput = {
  stageId: string
  skuIds: string[]
}

export async function assignStageSkus(
  input: AssignStageSkusInput
): Promise<ActionResult<{ assigned: number; removed: number }>> {
  if (!input.stageId) return failure("Select a production stage.")

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  const { data: stage, error: stageError } = await supabase
    .from("production_stages")
    .select("id, name")
    .eq("id", input.stageId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (stageError) return failure(stageError.message)
  if (!stage) return failure("Production stage not found in this company.")

  const skuIds = Array.from(
    new Set(input.skuIds.map((id) => id.trim()).filter(Boolean))
  )

  if (skuIds.length > 0) {
    const { data: skus, error: skuError } = await supabase
      .from("skus")
      .select("id")
      .eq("company_id", companyId)
      .in("id", skuIds)
    if (skuError) return failure(skuError.message)
    if ((skus?.length ?? 0) !== skuIds.length) {
      return failure("One or more SKUs do not belong to this company.")
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from("production_stage_skus")
    .select("sku_id")
    .eq("company_id", companyId)
    .eq("stage_id", stage.id)
  if (existingError) return failure(existingError.message)

  const existingIds = new Set(
    ((existing ?? []) as { sku_id: string }[]).map((row) => row.sku_id)
  )
  const selectedIds = new Set(skuIds)
  const toAdd = skuIds.filter((id) => !existingIds.has(id))
  const toRemove = Array.from(existingIds).filter((id) => !selectedIds.has(id))

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("production_stage_skus")
      .delete()
      .eq("company_id", companyId)
      .eq("stage_id", stage.id)
      .in("sku_id", toRemove)
    if (error) return failure(error.message)
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("production_stage_skus").insert(
      toAdd.map((skuId) => ({
        company_id: companyId,
        stage_id: stage.id,
        sku_id: skuId,
        assigned_by: userId,
      }))
    )
    if (error) return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "production_stage",
      entityId: stage.id,
      summary: `Assigned ${skuIds.length} SKU(s) to stage ${stage.name}`,
      metadata: {
        assigned: toAdd.length,
        removed: toRemove.length,
      },
    }
  )

  revalidatePath("/production")
  revalidatePath("/production/stages")
  revalidatePath(`/production/stages/${stage.id}/assign`)
  revalidatePath("/production/usage")
  revalidatePath("/production/usage/new")
  revalidatePath("/feed")

  return {
    success: true,
    data: { assigned: toAdd.length, removed: toRemove.length },
  }
}

export type CreateUsageItemInput = {
  skuId: string
  quantity: number
}

export type CreateUsageInput = {
  pipelineId: string
  stageId: string
  usageDate?: string
  notes?: string
  items: CreateUsageItemInput[]
}

export async function createProductionUsage(
  input: CreateUsageInput
): Promise<ActionResult<{ batchId: string; created: number }>> {
  if (!input.pipelineId) return failure("Select a pipeline.")
  if (!input.stageId) return failure("Select a production stage.")

  const itemsBySku = new Map<string, number>()
  for (const item of input.items ?? []) {
    const skuId = item.skuId?.trim()
    if (!skuId) continue
    if (!Number.isFinite(item.quantity) || item.quantity < 0) {
      return failure("Enter a valid usage quantity for every selected SKU.")
    }
    itemsBySku.set(skuId, (itemsBySku.get(skuId) ?? 0) + item.quantity)
  }

  if (itemsBySku.size === 0) {
    return failure("Select at least one SKU assigned to the stage.")
  }

  const authorized = await getAuthorizedContextAny([
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const { data: stage, error: stageError } = await supabase
    .from("production_stages")
    .select("id, name, pipeline_id")
    .eq("id", input.stageId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (stageError) return failure(stageError.message)
  if (!stage) return failure("Production stage not found in this company.")
  if (stage.pipeline_id !== input.pipelineId) {
    return failure("The selected stage does not belong to that pipeline.")
  }

  const { data: pipeline, error: pipelineError } = await supabase
    .from("production_pipelines")
    .select("id")
    .eq("id", input.pipelineId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (pipelineError) return failure(pipelineError.message)
  if (!pipeline) return failure("Production pipeline not found in this company.")

  const skuIds = Array.from(itemsBySku.keys())
  const { data: assignments, error: assignmentError } = await supabase
    .from("production_stage_skus")
    .select("sku_id, sku:skus(id, sku_code, name, uom)")
    .eq("company_id", companyId)
    .eq("stage_id", stage.id)
    .in("sku_id", skuIds)
  if (assignmentError) return failure(assignmentError.message)

  const assignedSkus = new Map(
    ((assignments ?? []) as unknown as {
      sku_id: string
      sku: {
        id: string
        sku_code: string
        name: string
        uom: string | null
      } | null
    }[]).map((assignment) => [assignment.sku_id, assignment.sku])
  )

  if (assignedSkus.size !== skuIds.length) {
    return failure("One or more selected SKUs are not assigned to this stage.")
  }

  const now = new Date().toISOString()
  const usageDate = input.usageDate?.trim() || now.slice(0, 10)
  const batchId = randomUUID()
  const notes = input.notes?.trim() || null

  const { data, error } = await supabase
    .from("production_usage")
    .insert(
      skuIds.map((skuId) => ({
        company_id: companyId,
        workspace_id: workspaceId,
        pipeline_id: input.pipelineId,
        stage_id: stage.id,
        batch_id: batchId,
        sku_id: skuId,
        quantity: itemsBySku.get(skuId) ?? 0,
        uom: assignedSkus.get(skuId)?.uom || null,
        usage_date: usageDate,
        notes,
        submitted_by: userId,
        recorded_by: userId,
        recorded_at: now,
        updated_at: now,
      }))
    )
    .select("id")

  if (error) {
    console.error("[action:createProductionUsage]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "usage",
      entityType: "production_usage",
      entityId: batchId,
      summary: `Recorded usage for ${skuIds.length} SKU(s) at ${stage.name}`,
      metadata: {
        pipeline_id: input.pipelineId,
        stage_id: stage.id,
        batch_id: batchId,
        items: skuIds.map((skuId) => ({
          sku_id: skuId,
          quantity: itemsBySku.get(skuId) ?? 0,
          uom: assignedSkus.get(skuId)?.uom ?? null,
        })),
      },
    }
  )

  revalidatePath("/production")
  revalidatePath("/production/usage")
  revalidatePath("/production/usage/my")
  revalidatePath("/production/stages")
  revalidatePath("/feed")

  return {
    success: true,
    data: { batchId, created: data?.length ?? skuIds.length },
  }
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
