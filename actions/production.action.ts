"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  getAuthorizedContextAny,
  type ActionResult,
  type AuthorizedActionContext,
} from "@/actions/helpers/context"
import { logActivity } from "@/actions/helpers/activity"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { cell, headerMap, parseCsv, toCsv } from "@/lib/csv"
import {
  isBeyondCutoff,
  normalizeTime,
  resolveUsageStatus,
  toUsageSettings,
  type UsageSettings,
} from "@/lib/production/usage-status"
import type { ProductionUsageSettings } from "@/db/models/models"

const RUN_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const

function runStatus(value?: string) {
  const normalized = String(value ?? "").toLowerCase()
  return (RUN_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as (typeof RUN_STATUSES)[number])
    : "planned"
}

type UsageActionSupabase = AuthorizedActionContext["supabase"]

type UsageMutationContext = {
  companyId: string
  workspaceId: string | null
  userId: string
}

type UsageChangelogInput = {
  usage_id: string
  batch_id: string | null
  action: string
  previous_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  reason?: string | null
}

async function loadUsageSettings(
  supabase: UsageActionSupabase,
  companyId: string
): Promise<UsageSettings> {
  const { data, error } = await supabase
    .from("production_usage_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle()

  if (error) {
    console.error("[action:loadUsageSettings]", error)
    return toUsageSettings(null)
  }
  return toUsageSettings((data as ProductionUsageSettings | null) ?? null)
}

async function recordUsageChangelog(
  supabase: UsageActionSupabase,
  context: UsageMutationContext,
  entries: UsageChangelogInput[]
) {
  if (entries.length === 0) return

  const { error } = await supabase.from("production_usage_changelog").insert(
    entries.map((entry) => ({
      company_id: context.companyId,
      workspace_id: context.workspaceId,
      changed_by: context.userId,
      usage_id: entry.usage_id,
      batch_id: entry.batch_id,
      action: entry.action,
      previous_values: entry.previous_values ?? null,
      new_values: entry.new_values ?? null,
      reason: entry.reason ?? null,
    }))
  )

  if (error) {
    console.error("[action:recordUsageChangelog]", error)
  }
}

/**
 * Adds the component lines of any selected BOM parents, so cancelling or
 * restoring a parent also applies to its components in the same usage entry.
 */
async function expandBomComponentRows(
  supabase: UsageActionSupabase,
  companyId: string,
  rows: { id: string; batch_id: string | null; sku_id: string | null }[]
) {
  const ids = new Set(rows.map((row) => row.id))
  const parentSkuIds = Array.from(
    new Set(
      rows
        .map((row) => row.sku_id)
        .filter((skuId): skuId is string => Boolean(skuId))
    )
  )
  if (parentSkuIds.length === 0) return ids

  const { data: componentRows, error } = await supabase
    .from("sku_components")
    .select("parent_sku_id, component_sku_id")
    .eq("company_id", companyId)
    .in("parent_sku_id", parentSkuIds)

  if (error) {
    console.error("[action:expandBomComponentRows]", error)
    return ids
  }

  const componentsByParent = new Map<string, Set<string>>()
  for (const row of (componentRows ?? []) as {
    parent_sku_id: string
    component_sku_id: string
  }[]) {
    const set = componentsByParent.get(row.parent_sku_id) ?? new Set<string>()
    set.add(row.component_sku_id)
    componentsByParent.set(row.parent_sku_id, set)
  }

  const cascades = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!row.sku_id) continue
    const components = componentsByParent.get(row.sku_id)
    if (!components || components.size === 0) continue
    const batchKey = row.batch_id ?? row.id
    const pair = cascades.get(batchKey) ?? new Set<string>()
    components.forEach((componentId) => pair.add(componentId))
    cascades.set(batchKey, pair)
  }
  if (cascades.size === 0) return ids

  const batchKeys = Array.from(cascades.keys())
  const componentSkuIds = Array.from(
    new Set(Array.from(cascades.values()).flatMap((set) => Array.from(set)))
  )

  const [byBatch, byId] = await Promise.all([
    supabase
      .from("production_usage")
      .select("id, batch_id, sku_id")
      .eq("company_id", companyId)
      .in("batch_id", batchKeys)
      .in("sku_id", componentSkuIds),
    supabase
      .from("production_usage")
      .select("id, batch_id, sku_id")
      .eq("company_id", companyId)
      .in("id", batchKeys)
      .in("sku_id", componentSkuIds),
  ])

  if (byBatch.error || byId.error) {
    console.error(
      "[action:expandBomComponentRows]",
      byBatch.error ?? byId.error
    )
    return ids
  }

  const candidates = [
    ...((byBatch.data ?? []) as {
      id: string
      batch_id: string | null
      sku_id: string | null
    }[]),
    ...((byId.data ?? []) as {
      id: string
      batch_id: string | null
      sku_id: string | null
    }[]),
  ]

  for (const candidate of candidates) {
    if (!candidate.sku_id) continue
    const batchKey = candidate.batch_id ?? candidate.id
    const components = cascades.get(batchKey)
    if (components?.has(candidate.sku_id)) ids.add(candidate.id)
  }

  return ids
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
  revalidatePath("/production/pipelines")
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
  revalidatePath("/production/pipelines")
  revalidatePath(`/production/pipelines/${data.id}`)
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
  revalidatePath("/production/pipelines")
  revalidatePath("/production/stages")
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
  revalidatePath("/production/stages")
  revalidatePath("/production/pipelines")
  revalidatePath(`/production/pipelines/${input.pipelineId}`)
  revalidatePath("/production/usage/new")
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
  revalidatePath("/production/stages")
  revalidatePath("/production/pipelines")
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
  revalidatePath("/production/stages")
  revalidatePath("/production/pipelines")
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
  revalidatePath("/production/stages")
  revalidatePath(`/production/pipelines/${pipelineId}`)

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

  // Only BOM SKUs (SKUs that own components) may be recorded as a parent
  // entry. Component SKUs are allowed only when they belong to a BOM parent
  // that is also part of this same usage entry.
  const { data: componentRows, error: componentError } = await supabase
    .from("sku_components")
    .select("parent_sku_id, component_sku_id")
    .eq("company_id", companyId)
    .in("parent_sku_id", skuIds)
  if (componentError) return failure(componentError.message)

  const bomParentIds = new Set(
    ((componentRows ?? []) as { parent_sku_id: string }[]).map(
      (row) => row.parent_sku_id
    )
  )
  const componentIdsOfSubmittedParents = new Set(
    ((componentRows ?? []) as { component_sku_id: string }[]).map(
      (row) => row.component_sku_id
    )
  )

  for (const skuId of skuIds) {
    if (bomParentIds.has(skuId)) continue
    if (componentIdsOfSubmittedParents.has(skuId)) continue
    return failure("Only BOM SKUs can be added to production usage.")
  }

  const now = new Date().toISOString()
  const usageDate = input.usageDate?.trim() || now.slice(0, 10)
  const batchId = randomUUID()
  const notes = input.notes?.trim() || null

  // Duplicate submissions for the same stage, SKU and usage date are blocked
  // unless the company configuration allows them. Cancelled lines do not
  // count as an existing submission.
  const settings = await loadUsageSettings(supabase, companyId)
  if (!settings.allowDuplicates) {
    const { data: existingRows, error: existingError } = await supabase
      .from("production_usage")
      .select("sku_id")
      .eq("company_id", companyId)
      .eq("stage_id", stage.id)
      .eq("usage_date", usageDate)
      .neq("status", "cancelled")
      .in("sku_id", skuIds)

    if (existingError) {
      console.error("[action:createProductionUsage]", existingError)
      return failure(existingError.message)
    }

    const duplicateSkuIds = new Set(
      ((existingRows ?? []) as { sku_id: string | null }[])
        .map((row) => row.sku_id)
        .filter((id): id is string => Boolean(id))
    )
    if (duplicateSkuIds.size > 0) {
      const labels = Array.from(duplicateSkuIds)
        .map((id) => assignedSkus.get(id)?.sku_code ?? id)
        .join(", ")
      return failure(
        `Usage already exists for ${labels} on ${usageDate}. Duplicate submissions are disabled in the usage settings.`
      )
    }
  }

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
        status: "submitted",
        submitted_by: userId,
        recorded_by: userId,
        recorded_at: now,
        updated_at: now,
      }))
    )
    .select("id, sku_id")

  if (error) {
    console.error("[action:createProductionUsage]", error)
    return failure(error.message)
  }

  await recordUsageChangelog(
    supabase,
    { companyId, workspaceId, userId },
    ((data ?? []) as { id: string; sku_id: string | null }[]).map((row) => ({
      usage_id: row.id,
      batch_id: batchId,
      action: "created",
      new_values: {
        sku_id: row.sku_id,
        quantity: itemsBySku.get(row.sku_id ?? "") ?? 0,
        usage_date: usageDate,
        notes,
        status: "submitted",
      },
    }))
  )

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
  revalidatePath("/production/usage-editor")
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

export type ProductionUsageLineUpdate = {
  id: string
  quantity?: number
  usageDate?: string
  notes?: string | null
}

export type ProductionUsageSettingsInput = {
  cutoffDays: number
  cutoffTime: string
  allowSubmitterEdit: boolean
  allowDuplicates: boolean
}

const USAGE_EDITOR_PATHS = [
  "/production",
  "/production/usage",
  "/production/usage/my",
  "/production/usage-editor",
  "/production/usage-settings",
  "/production/audit",
  "/feed",
] as const

function revalidateUsageEditorPaths() {
  for (const path of USAGE_EDITOR_PATHS) revalidatePath(path)
}

/**
 * Saves the lifecycle configuration for production usage. Only users with the
 * special usage-editor permission may change the cutoff window and submission
 * rules.
 */
export async function updateProductionUsageSettings(
  input: ProductionUsageSettingsInput
): Promise<ActionResult<{ id: string }>> {
  const cutoffDays = Math.trunc(Number(input.cutoffDays))
  if (!Number.isFinite(cutoffDays) || cutoffDays < 0 || cutoffDays > 365) {
    return failure("Cutoff days must be a number between 0 and 365.")
  }
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(input.cutoffTime ?? "")) {
    return failure("Enter a valid cutoff time (HH:MM).")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_EDITOR)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("production_usage_settings")
    .upsert(
      {
        company_id: companyId,
        cutoff_days: cutoffDays,
        cutoff_time: `${normalizeTime(input.cutoffTime)}:00`,
        allow_submitter_edit: Boolean(input.allowSubmitterEdit),
        allow_duplicates: Boolean(input.allowDuplicates),
        updated_by: userId,
        updated_at: now,
      },
      { onConflict: "company_id" }
    )
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateProductionUsageSettings]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "production_usage_settings",
      entityId: data.id,
      summary: "Updated production usage settings",
      metadata: {
        cutoff_days: cutoffDays,
        cutoff_time: `${normalizeTime(input.cutoffTime)}:00`,
        allow_submitter_edit: Boolean(input.allowSubmitterEdit),
        allow_duplicates: Boolean(input.allowDuplicates),
      },
    }
  )

  revalidateUsageEditorPaths()

  return { success: true, data: { id: data.id } }
}

/**
 * Saves inline edits from the usage editor. Users with `production.editor`
 * may update any usage line, regardless of who submitted it.
 */
export async function updateProductionUsageLines(input: {
  lines: ProductionUsageLineUpdate[]
}): Promise<ActionResult<{ updated: number }>> {
  const lines = (input.lines ?? []).filter((line) => Boolean(line?.id))
  if (lines.length === 0) {
    return failure("No usage lines were changed.")
  }

  for (const line of lines) {
    if (
      line.quantity !== undefined &&
      (!Number.isFinite(line.quantity) || line.quantity < 0)
    ) {
      return failure("Quantities must be numbers greater than or equal to 0.")
    }
    if (
      line.usageDate !== undefined &&
      !/^\d{4}-\d{2}-\d{2}$/.test(line.usageDate)
    ) {
      return failure("Usage dates must use the YYYY-MM-DD format.")
    }
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_EDITOR)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  const ids = Array.from(new Set(lines.map((line) => line.id)))

  type ExistingUsageRow = {
    id: string
    batch_id: string | null
    quantity: number
    usage_date: string
    notes: string | null
    status: string
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("production_usage")
    .select("id, batch_id, quantity, usage_date, notes, status")
    .eq("company_id", companyId)
    .in("id", ids)

  if (existingError) {
    console.error("[action:updateProductionUsageLines]", existingError)
    return failure(existingError.message)
  }

  const rows = (existingRows ?? []) as ExistingUsageRow[]
  if (rows.length !== ids.length) {
    return failure("One or more usage lines no longer exist in this company.")
  }

  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const now = new Date().toISOString()
  const changelog: UsageChangelogInput[] = []

  for (const line of lines) {
    const row = rowsById.get(line.id)
    if (!row) continue

    if (row.status === "cancelled") {
      return failure(
        "Cancelled usage is read-only. Restore the line before editing it."
      )
    }

    const payload: Record<string, unknown> = { updated_at: now }
    const previous: Record<string, unknown> = {}
    const next: Record<string, unknown> = {}

    if (line.quantity !== undefined) {
      payload.quantity = line.quantity
      if (Number(row.quantity) !== line.quantity) {
        previous.quantity = Number(row.quantity)
        next.quantity = line.quantity
      }
    }
    if (line.usageDate !== undefined) {
      payload.usage_date = line.usageDate
      if (row.usage_date?.slice(0, 10) !== line.usageDate) {
        previous.usage_date = row.usage_date?.slice(0, 10) ?? null
        next.usage_date = line.usageDate
      }
    }
    if (line.notes !== undefined) {
      const notes = line.notes?.trim() || null
      payload.notes = notes
      if ((row.notes ?? "") !== (notes ?? "")) {
        previous.notes = row.notes
        next.notes = notes
      }
    }

    const { error } = await supabase
      .from("production_usage")
      .update(payload)
      .eq("id", line.id)
      .eq("company_id", companyId)

    if (error) {
      console.error("[action:updateProductionUsageLines]", error)
      return failure(error.message)
    }

    if (Object.keys(next).length > 0) {
      changelog.push({
        usage_id: line.id,
        batch_id: row.batch_id,
        action: "updated",
        previous_values: previous,
        new_values: next,
      })
    }
  }

  await recordUsageChangelog(
    supabase,
    { companyId, workspaceId, userId },
    changelog
  )

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "production_usage",
      summary: `Updated ${lines.length} production usage line(s) from the usage editor`,
      metadata: {
        lines: lines.map((line) => ({
          id: line.id,
          quantity: line.quantity,
          usage_date: line.usageDate,
          notes: line.notes,
        })),
      },
    }
  )

  revalidateUsageEditorPaths()

  return { success: true, data: { updated: lines.length } }
}

export type ProductionUsageLifecycleStatus = "submitted" | "cancelled"

/**
 * Marks usage lines as a cancellation or restores them to submitted. Hard
 * deletes are intentionally not exposed: a cancelled BOM parent also cancels
 * its component lines in the same usage entry.
 */
export async function setProductionUsageStatus(input: {
  ids: string[]
  status: ProductionUsageLifecycleStatus
  reason?: string | null
}): Promise<ActionResult<{ updated: number; cascaded: number }>> {
  const ids = Array.from(new Set((input.ids ?? []).filter(Boolean)))
  if (ids.length === 0) {
    return failure("Select at least one usage line.")
  }
  if (input.status !== "submitted" && input.status !== "cancelled") {
    return failure("Invalid usage status.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_EDITOR)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  type StatusRow = {
    id: string
    batch_id: string | null
    sku_id: string | null
    status: string
  }

  const { data: selectedRows, error: selectedError } = await supabase
    .from("production_usage")
    .select("id, batch_id, sku_id, status")
    .eq("company_id", companyId)
    .in("id", ids)

  if (selectedError) {
    console.error("[action:setProductionUsageStatus]", selectedError)
    return failure(selectedError.message)
  }
  if (!selectedRows || selectedRows.length === 0) {
    return failure("The selected usage lines were not found in this company.")
  }

  const rows = selectedRows as StatusRow[]
  const allIds = await expandBomComponentRows(supabase, companyId, rows)

  const { data: targetRows, error: targetError } = await supabase
    .from("production_usage")
    .select("id, batch_id, status")
    .eq("company_id", companyId)
    .in("id", Array.from(allIds))

  if (targetError) {
    console.error("[action:setProductionUsageStatus]", targetError)
    return failure(targetError.message)
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("production_usage")
    .update({ status: input.status, updated_at: now })
    .eq("company_id", companyId)
    .in("id", Array.from(allIds))

  if (error) {
    console.error("[action:setProductionUsageStatus]", error)
    return failure(error.message)
  }

  const action = input.status === "cancelled" ? "cancelled" : "restored"
  const reason = input.reason?.trim() || null
  const changelog = ((targetRows ?? []) as {
    id: string
    batch_id: string | null
    status: string
  }[])
    .filter((row) => row.status !== input.status)
    .map((row) => ({
      usage_id: row.id,
      batch_id: row.batch_id,
      action,
      previous_values: { status: row.status },
      new_values: { status: input.status },
      reason,
    }))

  await recordUsageChangelog(
    supabase,
    { companyId, workspaceId, userId },
    changelog
  )

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: input.status === "cancelled" ? "cancel" : "restore",
      entityType: "production_usage",
      summary:
        input.status === "cancelled"
          ? `Marked ${allIds.size} production usage line(s) as cancellation`
          : `Restored ${allIds.size} production usage line(s) to submitted`,
      metadata: {
        requested_ids: ids,
        affected_ids: Array.from(allIds),
        status: input.status,
        reason,
        cascaded: allIds.size - rows.length,
      },
    }
  )

  revalidateUsageEditorPaths()

  return {
    success: true,
    data: { updated: allIds.size, cascaded: allIds.size - rows.length },
  }
}

/**
 * Submitter-facing edit. It is enabled by the usage settings and only works
 * for the submitter's own lines while they are still inside the cutoff window.
 */
export async function updateOwnProductionUsage(input: {
  ids: string[]
  usageDate?: string
  notes?: string | null
  items?: { id: string; quantity: number }[]
  cancel?: boolean
}): Promise<ActionResult<{ updated: number }>> {
  const ids = Array.from(new Set((input.ids ?? []).filter(Boolean)))
  if (ids.length === 0) {
    return failure("Select at least one usage line.")
  }

  if (
    input.usageDate !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(input.usageDate)
  ) {
    return failure("Usage dates must use the YYYY-MM-DD format.")
  }

  const authorized = await getAuthorizedContextAny([
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
  ])
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  const settings = await loadUsageSettings(supabase, companyId)
  if (!settings.allowSubmitterEdit) {
    return failure(
      "Submitter edits are disabled. Ask an administrator to enable them in the usage settings."
    )
  }

  type OwnUsageRow = {
    id: string
    batch_id: string | null
    sku_id: string | null
    quantity: number
    usage_date: string
    notes: string | null
    status: "submitted" | "completed" | "cancelled"
    submitted_by: string | null
    recorded_by: string | null
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("production_usage")
    .select(
      "id, batch_id, sku_id, quantity, usage_date, notes, status, submitted_by, recorded_by"
    )
    .eq("company_id", companyId)
    .in("id", ids)

  if (existingError) {
    console.error("[action:updateOwnProductionUsage]", existingError)
    return failure(existingError.message)
  }

  const rows = (existingRows ?? []) as OwnUsageRow[]
  if (rows.length !== ids.length) {
    return failure("One or more usage lines no longer exist in this company.")
  }

  for (const row of rows) {
    const owner = row.submitted_by ?? row.recorded_by
    if (owner !== userId) {
      return failure("You can only edit usage that you submitted.")
    }
    if (resolveUsageStatus(row, settings) === "cancelled") {
      return failure("Cancelled usage can no longer be edited.")
    }
    if (isBeyondCutoff(row.usage_date, settings)) {
      return failure(
        "The cutoff date/time has passed for this usage. Ask a usage editor to make the correction."
      )
    }
  }

  const now = new Date().toISOString()

  if (input.cancel) {
    const allIds = await expandBomComponentRows(supabase, companyId, rows)

    const { data: affectedRows, error: affectedError } = await supabase
      .from("production_usage")
      .select("id, batch_id, status")
      .eq("company_id", companyId)
      .in("id", Array.from(allIds))

    if (affectedError) {
      console.error("[action:updateOwnProductionUsage]", affectedError)
      return failure(affectedError.message)
    }

    const { error } = await supabase
      .from("production_usage")
      .update({ status: "cancelled", updated_at: now })
      .eq("company_id", companyId)
      .in("id", Array.from(allIds))

    if (error) {
      console.error("[action:updateOwnProductionUsage]", error)
      return failure(error.message)
    }

    await recordUsageChangelog(
      supabase,
      { companyId, workspaceId, userId },
      ((affectedRows ?? []) as {
        id: string
        batch_id: string | null
        status: string
      }[])
        .filter((row) => row.status !== "cancelled")
        .map((row) => ({
          usage_id: row.id,
          batch_id: row.batch_id,
          action: "submitter_cancelled",
          previous_values: { status: row.status },
          new_values: { status: "cancelled" },
          reason: "Cancelled by the submitter before the cutoff.",
        }))
    )

    await logActivity(
      supabase,
      { companyId, workspaceId, userId },
      authorized.context.employee?.id ?? null,
      {
        action: "cancel",
        entityType: "production_usage",
        summary: `Submitter cancelled ${allIds.size} production usage line(s)`,
        metadata: { requested_ids: ids, affected_ids: Array.from(allIds) },
      }
    )

    revalidateUsageEditorPaths()
    return { success: true, data: { updated: allIds.size } }
  }

  const quantities = new Map(
    (input.items ?? []).map((item) => [item.id, item.quantity])
  )
  for (const item of input.items ?? []) {
    if (!Number.isFinite(item.quantity) || item.quantity < 0) {
      return failure("Quantities must be numbers greater than or equal to 0.")
    }
  }

  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const changelog: UsageChangelogInput[] = []

  for (const id of ids) {
    const row = rowsById.get(id)
    if (!row) continue

    const payload: Record<string, unknown> = { updated_at: now }
    const previous: Record<string, unknown> = {}
    const next: Record<string, unknown> = {}

    if (quantities.has(id)) {
      const quantity = quantities.get(id) as number
      payload.quantity = quantity
      if (Number(row.quantity) !== quantity) {
        previous.quantity = Number(row.quantity)
        next.quantity = quantity
      }
    }
    if (input.usageDate !== undefined) {
      payload.usage_date = input.usageDate
      if (row.usage_date?.slice(0, 10) !== input.usageDate) {
        previous.usage_date = row.usage_date?.slice(0, 10) ?? null
        next.usage_date = input.usageDate
      }
    }
    if (input.notes !== undefined) {
      const notes = input.notes?.trim() || null
      payload.notes = notes
      if ((row.notes ?? "") !== (notes ?? "")) {
        previous.notes = row.notes
        next.notes = notes
      }
    }

    const { error } = await supabase
      .from("production_usage")
      .update(payload)
      .eq("id", id)
      .eq("company_id", companyId)

    if (error) {
      console.error("[action:updateOwnProductionUsage]", error)
      return failure(error.message)
    }

    if (Object.keys(next).length > 0) {
      changelog.push({
        usage_id: id,
        batch_id: row.batch_id,
        action: "submitter_updated",
        previous_values: previous,
        new_values: next,
        reason: "Edited by the submitter before the cutoff.",
      })
    }
  }

  await recordUsageChangelog(
    supabase,
    { companyId, workspaceId, userId },
    changelog
  )

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "production_usage",
      summary: `Submitter updated ${ids.length} production usage line(s)`,
      metadata: { ids },
    }
  )

  revalidateUsageEditorPaths()

  return { success: true, data: { updated: ids.length } }
}

export type ProductionUsageChangelogEntry = {
  id: string
  action: string
  changedAt: string
  changedBy: string | null
  actorName: string | null
  employeeNo: string | null
  previousValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  reason: string | null
}

export async function getProductionUsageChangelog(
  usageId: string
): Promise<ActionResult<{ entries: ProductionUsageChangelogEntry[] }>> {
  if (!usageId) return failure("Usage line id is required.")

  const authorized = await getAuthorizedContextAny([
    PERMISSIONS.PRODUCTION_EDITOR,
    PERMISSIONS.PRODUCTION_VIEW,
    PERMISSIONS.PRODUCTION_UPDATE,
    PERMISSIONS.PRODUCTION_CREATE,
  ])
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("production_usage_changelog")
    .select(
      "id, action, changed_by, changed_at, previous_values, new_values, reason"
    )
    .eq("company_id", companyId)
    .eq("usage_id", usageId)
    .order("changed_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("[action:getProductionUsageChangelog]", error)
    return failure(error.message)
  }

  const rows = (data ?? []) as {
    id: string
    action: string
    changed_by: string | null
    changed_at: string
    previous_values: Record<string, unknown> | null
    new_values: Record<string, unknown> | null
    reason: string | null
  }[]

  const userIds = Array.from(
    new Set(
      rows
        .map((row) => row.changed_by)
        .filter((id): id is string => Boolean(id))
    )
  )

  const employees = new Map<
    string,
    { first_name: string; last_name: string; employee_no: string }
  >()
  if (userIds.length > 0) {
    const { data: employeeRows } = await supabase
      .from("employees")
      .select("user_id, employee_no, first_name, last_name")
      .eq("company_id", companyId)
      .in("user_id", userIds)

    for (const employee of (employeeRows ?? []) as {
      user_id: string | null
      employee_no: string
      first_name: string
      last_name: string
    }[]) {
      if (!employee.user_id) continue
      employees.set(employee.user_id, employee)
    }
  }

  return {
    success: true,
    data: {
      entries: rows.map((row) => {
        const employee = row.changed_by
          ? employees.get(row.changed_by)
          : undefined
        return {
          id: row.id,
          action: row.action,
          changedAt: row.changed_at,
          changedBy: row.changed_by,
          actorName: employee
            ? `${employee.first_name} ${employee.last_name}`
            : null,
          employeeNo: employee?.employee_no ?? null,
          previousValues: row.previous_values,
          newValues: row.new_values,
          reason: row.reason,
        }
      }),
    },
  }
}

const PRODUCTION_USAGE_CSV_HEADERS = [
  "batch_id",
  "usage_date",
  "pipeline_code",
  "pipeline_name",
  "stage",
  "sku_code",
  "sku_name",
  "status",
  "previous_quantity",
  "quantity",
  "uom",
  "notes",
  "updated_at",
] as const

export type ProductionUsageCsvExport = {
  filename: string
  csv: string
  rowCount: number
}

type ProductionUsageExportRow = {
  id: string
  batch_id: string
  quantity: number
  usage_date: string
  notes: string | null
  status: string
  updated_at: string
  pipeline: { code: string | null; name: string | null } | null
  stage: { name: string | null; sequence: number | null } | null
  sku: { sku_code: string | null; name: string | null; uom: string | null } | null
}

export async function exportProductionUsage(): Promise<
  ActionResult<ProductionUsageCsvExport>
> {
  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_EDITOR)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context
  const { data, error } = await supabase
    .from("production_usage")
    .select(
      "id, batch_id, quantity, usage_date, notes, status, updated_at, pipeline:production_pipelines(code,name), stage:production_stages!stage_id(name,sequence), sku:skus(sku_code,name,uom)"
    )
    .eq("company_id", companyId)
    .order("recorded_at", { ascending: false })

  if (error) {
    console.error("[action:exportProductionUsage]", error)
    return failure(error.message)
  }

  const rows = (data ?? []) as unknown as ProductionUsageExportRow[]
  const csv = toCsv(
    PRODUCTION_USAGE_CSV_HEADERS,
    rows.map((row) => [
      row.batch_id,
      row.usage_date,
      row.pipeline?.code ?? "",
      row.pipeline?.name ?? "",
      row.stage
        ? `${row.stage.sequence ?? ""}. ${row.stage.name ?? ""}`.trim()
        : "",
      row.sku?.sku_code ?? "",
      row.sku?.name ?? "",
      row.status,
      row.quantity,
      row.quantity,
      row.sku?.uom ?? "",
      row.notes ?? "",
      row.updated_at,
    ])
  )

  return {
    success: true,
    data: {
      filename: `production-usage-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      rowCount: rows.length,
    },
  }
}

export type ProductionUsageImportConflict = {
  row: number
  batchId: string
  skuCode: string
  reason: string
  usageId: string | null
  quantity: number | null
  usageDate: string | null
  notes: string | null
}

export type ProductionUsageImportResult = {
  updated: number
  skipped: number
  conflicts: ProductionUsageImportConflict[]
}

type UsageImportRow = {
  id: string
  batch_id: string
  sku_id: string | null
  quantity: number
  usage_date: string
  notes: string | null
  status: string
  updated_at: string
}

/**
 * Applies quantity/date/notes updates from a CSV exported with
 * `exportProductionUsage`. Rows whose baseline changed after the export (or
 * that cannot be matched unambiguously) are returned as conflicts instead of
 * being applied, so an operator can review them.
 */
export async function importProductionUsageUpdates(input: {
  csv: string
}): Promise<ActionResult<ProductionUsageImportResult>> {
  if (!input.csv?.trim()) {
    return failure("Choose a CSV file with production usage rows.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_EDITOR)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  const parsed = parseCsv(input.csv)
  if (parsed.length < 2) {
    return failure(
      "The CSV must contain a header row and at least one usage line."
    )
  }

  const map = headerMap(parsed[0])
  if (!map.has("batch_id") || !map.has("sku_code") || !map.has("quantity")) {
    return failure(
      "The CSV must include batch_id, sku_code and quantity columns. Export the current usage to get the right template."
    )
  }

  const dataRows = parsed.slice(1)
  const batchIds = Array.from(
    new Set(
      dataRows
        .map((row) => cell(row, map, "batch_id"))
        .filter((value) => value !== "")
    )
  )

  if (batchIds.length === 0) {
    return failure("No usage rows were found in the CSV.")
  }

  const [usageResult, skuResult] = await Promise.all([
    supabase
      .from("production_usage")
      .select("id, batch_id, sku_id, quantity, usage_date, notes, status, updated_at")
      .eq("company_id", companyId)
      .in("batch_id", batchIds),
    supabase.from("skus").select("id, sku_code").eq("company_id", companyId),
  ])

  if (usageResult.error) {
    console.error("[action:importProductionUsageUpdates]", usageResult.error)
    return failure(usageResult.error.message)
  }
  if (skuResult.error) {
    console.error("[action:importProductionUsageUpdates]", skuResult.error)
    return failure(skuResult.error.message)
  }

  const usageRows = (usageResult.data ?? []) as UsageImportRow[]
  const usageByKey = new Map<string, UsageImportRow>()
  for (const row of usageRows) {
    if (!row.sku_id) continue
    usageByKey.set(`${row.batch_id}:${row.sku_id}`, row)
  }

  const skuByCode = new Map<string, { id: string; sku_code: string }>()
  for (const sku of (skuResult.data ?? []) as {
    id: string
    sku_code: string
  }[]) {
    skuByCode.set(sku.sku_code.toUpperCase(), sku)
  }

  const conflicts: ProductionUsageImportConflict[] = []
  const seen = new Set<string>()
  const changelog: UsageChangelogInput[] = []
  let updated = 0
  let skipped = 0
  const now = new Date().toISOString()

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index]
    const rowNumber = index + 2
    const batchId = cell(row, map, "batch_id")
    const skuCode = cell(row, map, "sku_code")
    const quantityText = cell(row, map, "quantity")
    const usageDateText = cell(row, map, "usage_date")
    const notesText = map.has("notes") ? cell(row, map, "notes") : ""

    const parsedQuantity = Number(quantityText)
    const desiredQuantity =
      quantityText !== "" && Number.isFinite(parsedQuantity)
        ? parsedQuantity
        : null

    // Conflicts carry the values from the CSV so the usage editor can offer to
    // delete the affected line or open it for a manual correction.
    const conflict = (reason: string, usageRow: UsageImportRow | null = null) => {
      conflicts.push({
        row: rowNumber,
        batchId,
        skuCode,
        reason,
        usageId: usageRow?.id ?? null,
        quantity: desiredQuantity,
        usageDate:
          usageDateText || usageRow?.usage_date?.slice(0, 10) || null,
        notes: map.has("notes")
          ? notesText || null
          : (usageRow?.notes ?? null),
      })
      skipped += 1
    }

    if (!batchId || !skuCode) {
      conflict("batch_id and sku_code are required.")
      continue
    }

    const quantity = Number(quantityText)
    if (
      quantityText === "" ||
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      conflict("quantity must be a number greater than or equal to 0.")
      continue
    }

    const sku = skuByCode.get(skuCode.toUpperCase())
    if (!sku) {
      conflict(`Unknown SKU code "${skuCode}".`)
      continue
    }

    const key = `${batchId}:${sku.id}`
    if (seen.has(key)) {
      conflict("Duplicate row for the same batch and SKU.")
      continue
    }
    seen.add(key)

    const usageRow = usageByKey.get(key)
    if (!usageRow) {
      conflict("No production usage line exists for this batch and SKU.")
      continue
    }

    const previousText = cell(row, map, "previous_quantity")
    if (previousText !== "") {
      const previous = Number(previousText)
      if (
        Number.isFinite(previous) &&
        Math.abs(previous - Number(usageRow.quantity)) > 0.0001
      ) {
        conflict(
          `Quantity changed since export (expected ${previous}, found ${usageRow.quantity}).`,
          usageRow
        )
        continue
      }
    }

    const updatedAtText = cell(row, map, "updated_at")
    if (
      updatedAtText &&
      usageRow.updated_at &&
      updatedAtText !== usageRow.updated_at
    ) {
      conflict("This line was modified after the CSV was exported.", usageRow)
      continue
    }

    const usageDate = cell(row, map, "usage_date") || usageRow.usage_date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(usageDate)) {
      conflict("usage_date must use the YYYY-MM-DD format.", usageRow)
      continue
    }

    const notes = map.has("notes")
      ? cell(row, map, "notes") || null
      : usageRow.notes

    // The status column drives the lifecycle. Cancelled lines are read-only,
    // so a row can only be restored (status = submitted) before it is edited.
    const statusText = map.has("status")
      ? cell(row, map, "status").toLowerCase()
      : ""
    const desiredStatus =
      statusText === "cancelled" || statusText === "cancellation"
        ? "cancelled"
        : statusText === "submitted" || statusText === "completed" || statusText === ""
          ? statusText === ""
            ? null
            : "submitted"
          : undefined

    if (desiredStatus === undefined) {
      conflict(
        `Unknown status "${statusText}". Use submitted or cancelled.`,
        usageRow
      )
      continue
    }

    if (statusText === "") {
      if (usageRow.status === "cancelled") {
        conflict(
          "This usage line was cancelled. Set its status to submitted to restore it first.",
          usageRow
        )
        continue
      }
    }

    if (usageRow.status === "cancelled" && desiredStatus !== "submitted") {
      conflict(
        "This usage line was cancelled. Set its status to submitted to restore it first.",
        usageRow
      )
      continue
    }

    if (desiredStatus === "cancelled") {
      const { error } = await supabase
        .from("production_usage")
        .update({ status: "cancelled", updated_at: now })
        .eq("id", usageRow.id)
        .eq("company_id", companyId)

      if (error) {
        console.error("[action:importProductionUsageUpdates]", error)
        conflict(`Could not cancel the line: ${error.message}`, usageRow)
        continue
      }

      changelog.push({
        usage_id: usageRow.id,
        batch_id: usageRow.batch_id,
        action: "import",
        previous_values: { status: usageRow.status },
        new_values: { status: "cancelled" },
        reason: "Cancelled through a usage import.",
      })
      updated += 1
      continue
    }

    const nextStatus =
      usageRow.status === "cancelled" ? "submitted" : usageRow.status

    const { error } = await supabase
      .from("production_usage")
      .update({
        quantity,
        usage_date: usageDate,
        notes,
        status: nextStatus,
        updated_at: now,
      })
      .eq("id", usageRow.id)
      .eq("company_id", companyId)

    if (error) {
      console.error("[action:importProductionUsageUpdates]", error)
      conflict(`Could not update the line: ${error.message}`, usageRow)
      continue
    }

    changelog.push({
      usage_id: usageRow.id,
      batch_id: usageRow.batch_id,
      action: "import",
      previous_values: {
        quantity: Number(usageRow.quantity),
        usage_date: usageRow.usage_date?.slice(0, 10) ?? null,
        notes: usageRow.notes,
        status: usageRow.status,
      },
      new_values: {
        quantity,
        usage_date: usageDate,
        notes,
        status: nextStatus,
      },
      reason: "Updated through a usage import.",
    })

    updated += 1
  }

  await recordUsageChangelog(
    supabase,
    { companyId, workspaceId, userId },
    changelog
  )

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "import",
      entityType: "production_usage",
      summary: `Imported production usage updates: ${updated} line(s) updated, ${conflicts.length} conflict(s)`,
      metadata: {
        updated,
        skipped,
        conflict_count: conflicts.length,
      },
    }
  )

  revalidateUsageEditorPaths()

  return { success: true, data: { updated, skipped, conflicts } }
}
