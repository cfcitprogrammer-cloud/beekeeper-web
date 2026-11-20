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
  isOutsideUsageWindow,
  normalizeTime,
  resolveUsageStatus,
  todayInTimeZone,
  toUsageSettings,
  usageDateIssue,
  usageWindow,
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
  companyId: string,
  workspaceId: string | null,
  timeZone?: string | null
): Promise<UsageSettings> {
  let row: ProductionUsageSettings | null = null

  if (workspaceId) {
    const { data, error } = await supabase
      .from("production_usage_settings")
      .select("*")
      .eq("company_id", companyId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
    if (error) {
      console.error("[action:loadUsageSettings]", error)
    } else {
      row = (data as ProductionUsageSettings | null) ?? null
    }
  }

  if (!row) {
    const { data, error } = await supabase
      .from("production_usage_settings")
      .select("*")
      .eq("company_id", companyId)
      .is("workspace_id", null)
      .maybeSingle()
    if (error) {
      console.error("[action:loadUsageSettings]", error)
    } else {
      row = (data as ProductionUsageSettings | null) ?? null
    }
  }

  return toUsageSettings(row, timeZone)
}

/**
 * Why a usage date is locked. The same window applies to every user, including
 * usage editors and administrators.
 */
function lockedUsageDateMessage(
  usageDate: string,
  settings: UsageSettings,
  now = new Date()
) {
  const window = usageWindow(settings, now)
  const issue = usageDateIssue(usageDate, settings, now)
  const direction = issue === "past" ? "older than" : "after"
  return `Usage dated ${usageDate} is ${direction} the allowed window (${window.start} to ${window.end}) and can no longer be submitted, edited or cancelled.`
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
  workspaceId: string | null,
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

  let bomComponentsQuery = supabase
    .from("sku_components")
    .select("parent_sku_id, component_sku_id")
    .eq("company_id", companyId)
    .in("parent_sku_id", parentSkuIds)
  if (workspaceId) {
    bomComponentsQuery = bomComponentsQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: componentRows, error } = await bomComponentsQuery

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
    (() => {
      let q = supabase
        .from("production_usage")
        .select("id, batch_id, sku_id")
        .eq("company_id", companyId)
        .in("batch_id", batchKeys)
        .in("sku_id", componentSkuIds)
      if (workspaceId) q = q.eq("workspace_id", workspaceId)
      return q
    })(),
    (() => {
      let q = supabase
        .from("production_usage")
        .select("id, batch_id, sku_id")
        .eq("company_id", companyId)
        .in("id", batchKeys)
        .in("sku_id", componentSkuIds)
      if (workspaceId) q = q.eq("workspace_id", workspaceId)
      return q
    })(),
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

  let pipelineUpdateQuery = supabase
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
  if (workspaceId) {
    pipelineUpdateQuery = pipelineUpdateQuery.eq("workspace_id", workspaceId)
  }
  const { data, error } = await pipelineUpdateQuery.select("id").single()

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

  let pipelineDeleteQuery = supabase
    .from("production_pipelines")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
  if (workspaceId) {
    pipelineDeleteQuery = pipelineDeleteQuery.eq("workspace_id", workspaceId)
  }
  const { error } = await pipelineDeleteQuery

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

  let pipelineLookupQuery = supabase
    .from("production_pipelines")
    .select("id")
    .eq("id", input.pipelineId)
    .eq("company_id", companyId)
  if (workspaceId) {
    pipelineLookupQuery = pipelineLookupQuery.eq("workspace_id", workspaceId)
  }
  const { data: pipeline, error: pipelineError } = await pipelineLookupQuery.maybeSingle()
  if (pipelineError) return failure(pipelineError.message)
  if (!pipeline) return failure("Pipeline not found in this company.")

  let lastStageQuery = supabase
    .from("production_stages")
    .select("sequence")
    .eq("pipeline_id", input.pipelineId)
    .order("sequence", { ascending: false })
    .limit(1)
  if (workspaceId) {
    lastStageQuery = lastStageQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: lastStage } = await lastStageQuery.maybeSingle()

  const sequence = (lastStage?.sequence ?? 0) + 1

  const { data, error } = await supabase
    .from("production_stages")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
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

  let stageUpdateQuery = supabase
    .from("production_stages")
    .update({
      name: input.name.trim(),
      stage_type: input.stageType?.trim() || "processing",
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
  if (workspaceId) {
    stageUpdateQuery = stageUpdateQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data, error } = await stageUpdateQuery.select("id").single()

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

  let stageDeleteQuery = supabase
    .from("production_stages")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
  if (workspaceId) {
    stageDeleteQuery = stageDeleteQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { error } = await stageDeleteQuery

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

  const { supabase, companyId, workspaceId } = authorized.context

  let reorderStagesQuery = supabase
    .from("production_stages")
    .select("id")
    .eq("company_id", companyId)
    .eq("pipeline_id", pipelineId)
  if (workspaceId) {
    reorderStagesQuery = reorderStagesQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: stages, error: stageError } = await reorderStagesQuery
  if (stageError) return failure(stageError.message)

  const stageIds = new Set(((stages ?? []) as { id: string }[]).map((stage) => stage.id))
  if (orderedStageIds.some((id) => !stageIds.has(id))) {
    return failure("One or more stages do not belong to this pipeline.")
  }

  // Move to temporary negative sequences first to avoid the unique
  // (pipeline_id, sequence) constraint during the swap.
  for (let index = 0; index < orderedStageIds.length; index += 1) {
    let reorderUpdateQuery = supabase
      .from("production_stages")
      .update({ sequence: -(index + 1), updated_at: new Date().toISOString() })
      .eq("id", orderedStageIds[index])
      .eq("company_id", companyId)
    if (workspaceId) {
      reorderUpdateQuery = reorderUpdateQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    }
    const { error } = await reorderUpdateQuery
    if (error) return failure(error.message)
  }

  for (let index = 0; index < orderedStageIds.length; index += 1) {
    let reorderUpdateQuery = supabase
      .from("production_stages")
      .update({ sequence: index + 1, updated_at: new Date().toISOString() })
      .eq("id", orderedStageIds[index])
      .eq("company_id", companyId)
    if (workspaceId) {
      reorderUpdateQuery = reorderUpdateQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    }
    const { error } = await reorderUpdateQuery
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

  let pipelineLookupQuery = supabase
    .from("production_pipelines")
    .select("id")
    .eq("id", input.pipelineId)
    .eq("company_id", companyId)
  if (workspaceId) {
    pipelineLookupQuery = pipelineLookupQuery.eq("workspace_id", workspaceId)
  }
  const { data: pipeline, error: pipelineError } = await pipelineLookupQuery.maybeSingle()
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

  let stageLookupQuery = supabase
    .from("production_stages")
    .select("id, name")
    .eq("id", input.stageId)
    .eq("company_id", companyId)
  if (workspaceId) {
    stageLookupQuery = stageLookupQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: stage, error: stageError } = await stageLookupQuery.maybeSingle()
  if (stageError) return failure(stageError.message)
  if (!stage) return failure("Production stage not found in this company.")

  const skuIds = Array.from(
    new Set(input.skuIds.map((id) => id.trim()).filter(Boolean))
  )

  if (skuIds.length > 0) {
    let skuLookupQuery = supabase
      .from("skus")
      .select("id")
      .eq("company_id", companyId)
      .in("id", skuIds)
    if (workspaceId) {
      skuLookupQuery = skuLookupQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    }
    const { data: skus, error: skuError } = await skuLookupQuery
    if (skuError) return failure(skuError.message)
    if ((skus?.length ?? 0) !== skuIds.length) {
      return failure("One or more SKUs do not belong to this company.")
    }
  }

  let existingStageSkusQuery = supabase
    .from("production_stage_skus")
    .select("sku_id")
    .eq("company_id", companyId)
    .eq("stage_id", stage.id)
  if (workspaceId) {
    existingStageSkusQuery = existingStageSkusQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: existing, error: existingError } = await existingStageSkusQuery
  if (existingError) return failure(existingError.message)

  const existingIds = new Set(
    ((existing ?? []) as { sku_id: string }[]).map((row) => row.sku_id)
  )
  const selectedIds = new Set(skuIds)
  const toAdd = skuIds.filter((id) => !existingIds.has(id))
  const toRemove = Array.from(existingIds).filter((id) => !selectedIds.has(id))

  if (toRemove.length > 0) {
    let removeStageSkusQuery = supabase
      .from("production_stage_skus")
      .delete()
      .eq("company_id", companyId)
      .eq("stage_id", stage.id)
      .in("sku_id", toRemove)
    if (workspaceId) {
      removeStageSkusQuery = removeStageSkusQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    }
    const { error } = await removeStageSkusQuery
    if (error) return failure(error.message)
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("production_stage_skus").insert(
      toAdd.map((skuId) => ({
        company_id: companyId,
        workspace_id: workspaceId,
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

  const { supabase, companyId, workspaceId, userId, companyTimezone } =
    authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  let usageStageLookupQuery = supabase
    .from("production_stages")
    .select("id, name, pipeline_id")
    .eq("id", input.stageId)
    .eq("company_id", companyId)
  if (workspaceId) {
    usageStageLookupQuery = usageStageLookupQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: stage, error: stageError } = await usageStageLookupQuery.maybeSingle()
  if (stageError) return failure(stageError.message)
  if (!stage) return failure("Production stage not found in this company.")
  if (stage.pipeline_id !== input.pipelineId) {
    return failure("The selected stage does not belong to that pipeline.")
  }

  let pipelineLookupQuery = supabase
    .from("production_pipelines")
    .select("id")
    .eq("id", input.pipelineId)
    .eq("company_id", companyId)
  if (workspaceId) {
    pipelineLookupQuery = pipelineLookupQuery.eq("workspace_id", workspaceId)
  }
  const { data: pipeline, error: pipelineError } = await pipelineLookupQuery.maybeSingle()
  if (pipelineError) return failure(pipelineError.message)
  if (!pipeline) return failure("Production pipeline not found in this company.")

  const skuIds = Array.from(itemsBySku.keys())
  let stageAssignmentsQuery = supabase
    .from("production_stage_skus")
    .select("sku_id, sku:skus(id, sku_code, name, uom)")
    .eq("company_id", companyId)
    .eq("stage_id", stage.id)
  if (workspaceId) {
    stageAssignmentsQuery = stageAssignmentsQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: stageAssignments, error: assignmentError } = await stageAssignmentsQuery
  if (assignmentError) return failure(assignmentError.message)

  const assignedSkus = new Map(
    ((stageAssignments ?? []) as unknown as {
      sku_id: string
      sku: {
        id: string
        sku_code: string
        name: string
        uom: string | null
      } | null
    }[]).map((assignment) => [assignment.sku_id, assignment.sku])
  )

  // Component SKUs are shown on the stage so BOM auto-expansion can create
  // usage lines for them. They are not stored in production_stage_skus, so
  // allow any component of an assigned BOM parent as well.
  const assignedParentIds = Array.from(assignedSkus.keys())
  let componentAssignmentQuery = supabase
    .from("sku_components")
    .select("parent_sku_id, component_sku_id")
    .eq("company_id", companyId)
    .in("parent_sku_id", assignedParentIds)
  if (workspaceId) {
    componentAssignmentQuery = componentAssignmentQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: componentAssignmentRows, error: componentAssignmentError } =
    await componentAssignmentQuery

  if (componentAssignmentError) {
    return failure(componentAssignmentError.message)
  }

  const componentSkuIds = new Set(
    ((componentAssignmentRows ?? []) as {
      parent_sku_id: string
      component_sku_id: string
    }[]).map((row) => row.component_sku_id)
  )

  const missingComponentSkus = Array.from(componentSkuIds).filter(
    (id) => !assignedSkus.has(id)
  )
  if (missingComponentSkus.length > 0) {
    let componentSkusQuery = supabase
      .from("skus")
      .select("id, sku_code, name, uom")
      .eq("company_id", companyId)
      .in("id", missingComponentSkus)
    if (workspaceId) {
      componentSkusQuery = componentSkusQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
    }
    const { data: componentSkus, error: componentSkuError } = await componentSkusQuery

    if (componentSkuError) return failure(componentSkuError.message)

    for (const sku of (componentSkus ?? []) as {
      id: string
      sku_code: string
      name: string
      uom: string | null
    }[]) {
      assignedSkus.set(sku.id, sku)
    }
  }

  const allowedSkuIds = new Set([
    ...assignedSkus.keys(),
    ...componentSkuIds,
  ])
  const missingSkus = skuIds.filter((id) => !allowedSkuIds.has(id))
  if (missingSkus.length > 0) {
    return failure("One or more selected SKUs are not assigned to this stage.")
  }

  // Only BOM SKUs (SKUs that own components) may be recorded as a parent
  // entry. Component SKUs are allowed only when they belong to a BOM parent
  // that is also part of this same usage entry.
  let componentRowsQuery = supabase
    .from("sku_components")
    .select("parent_sku_id, component_sku_id")
    .eq("company_id", companyId)
    .in("parent_sku_id", skuIds)
  if (workspaceId) {
    componentRowsQuery = componentRowsQuery.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
  }
  const { data: componentRows, error: componentError } = await componentRowsQuery
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
  const requestedDate = input.usageDate?.trim()
  if (requestedDate && !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return failure("Usage date must use the YYYY-MM-DD format.")
  }
  const usageDate = requestedDate || todayInTimeZone(companyTimezone)
  const batchId = randomUUID()
  const notes = input.notes?.trim() || null

  // Duplicate submissions for the same stage, SKU and usage date are blocked
  // unless the company configuration allows them. A line only counts as a
  // duplicate while it is active: when every existing line for that SKU on the
  // date is cancelled, the user may submit the SKU again.
  const settings = await loadUsageSettings(supabase, companyId, workspaceId, companyTimezone)

  // The allowed window applies to everyone, including usage editors: a usage
  // date may only be submitted from the current business day through
  // `cutoffDays` after it.
  if (isOutsideUsageWindow(usageDate, settings)) {
    return failure(lockedUsageDateMessage(usageDate, settings))
  }

  if (!settings.allowDuplicates) {
    let existingUsageQuery = supabase
      .from("production_usage")
      .select("sku_id, status")
      .eq("company_id", companyId)
      .eq("stage_id", stage.id)
      .eq("usage_date", usageDate)
      .in("sku_id", skuIds)
    if (workspaceId) {
      existingUsageQuery = existingUsageQuery.eq("workspace_id", workspaceId)
    }
    const { data: existingRows, error: existingError } = await existingUsageQuery

    if (existingError) {
      console.error("[action:createProductionUsage]", existingError)
      return failure(existingError.message)
    }

    const duplicateSkuIds = new Set(
      ((existingRows ?? []) as { sku_id: string | null; status: string }[])
        .filter((row) => row.status !== "cancelled")
        .map((row) => row.sku_id)
        .filter((id): id is string => Boolean(id))
    )
    if (duplicateSkuIds.size > 0) {
      const labels = Array.from(duplicateSkuIds)
        .map((id) => assignedSkus.get(id)?.sku_code ?? id)
        .join(", ")
      return failure(
        `Active usage already exists for ${labels} on ${usageDate}. Cancel the existing usage first or enable duplicate usage in the settings.`
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

  let runStatusQuery = supabase
    .from("production_runs")
    .update({
      status: normalized,
      started_at: normalized === "in_progress" ? now : undefined,
      completed_at: normalized === "completed" ? now : null,
      updated_at: now,
    })
    .eq("id", runId)
    .eq("company_id", companyId)
  if (workspaceId) {
    runStatusQuery = runStatusQuery.eq("workspace_id", workspaceId)
  }
  const { data, error } = await runStatusQuery.select("id, status, run_no").single()

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

  let runDeleteQuery = supabase
    .from("production_runs")
    .delete()
    .eq("id", runId)
    .eq("company_id", companyId)
  if (workspaceId) {
    runDeleteQuery = runDeleteQuery.eq("workspace_id", workspaceId)
  }
  const { error } = await runDeleteQuery

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
  if (!workspaceId) {
    return failure("No workspace is associated with your account.")
  }
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("production_usage_settings")
    .upsert(
      {
        company_id: companyId,
        workspace_id: workspaceId,
        cutoff_days: cutoffDays,
        cutoff_time: `${normalizeTime(input.cutoffTime)}:00`,
        allow_submitter_edit: Boolean(input.allowSubmitterEdit),
        allow_duplicates: Boolean(input.allowDuplicates),
        updated_by: userId,
        updated_at: now,
      },
      { onConflict: "company_id,workspace_id" }
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

  const { supabase, companyId, workspaceId, userId, companyTimezone } =
    authorized.context
  const settings = await loadUsageSettings(supabase, companyId, workspaceId, companyTimezone)
  const ids = Array.from(new Set(lines.map((line) => line.id)))

  type ExistingUsageRow = {
    id: string
    batch_id: string | null
    quantity: number
    usage_date: string
    notes: string | null
    status: string
  }

  let existingUsageLinesQuery = supabase
    .from("production_usage")
    .select("id, batch_id, quantity, usage_date, notes, status")
    .eq("company_id", companyId)
    .in("id", ids)
  if (workspaceId) {
    existingUsageLinesQuery = existingUsageLinesQuery.eq("workspace_id", workspaceId)
  }
  const { data: existingRows, error: existingError } = await existingUsageLinesQuery

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

    // The window applies to usage editors too: completed/past usage and dates
    // beyond the forward window stay locked.
    if (isOutsideUsageWindow(row.usage_date, settings)) {
      return failure(lockedUsageDateMessage(row.usage_date, settings))
    }
    if (
      line.usageDate !== undefined &&
      isOutsideUsageWindow(line.usageDate, settings)
    ) {
      return failure(lockedUsageDateMessage(line.usageDate, settings))
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

    let usageLineUpdateQuery = supabase
      .from("production_usage")
      .update(payload)
      .eq("id", line.id)
      .eq("company_id", companyId)
    if (workspaceId) {
      usageLineUpdateQuery = usageLineUpdateQuery.eq("workspace_id", workspaceId)
    }
    const { error } = await usageLineUpdateQuery

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

  const { supabase, companyId, workspaceId, userId, companyTimezone } =
    authorized.context
  const settings = await loadUsageSettings(supabase, companyId, workspaceId, companyTimezone)

  type StatusRow = {
    id: string
    batch_id: string | null
    sku_id: string | null
    status: string
  }

  let selectedUsageRowsQuery = supabase
    .from("production_usage")
    .select("id, batch_id, sku_id, status")
    .eq("company_id", companyId)
    .in("id", ids)
  if (workspaceId) {
    selectedUsageRowsQuery = selectedUsageRowsQuery.eq("workspace_id", workspaceId)
  }
  const { data: selectedRows, error: selectedError } = await selectedUsageRowsQuery

  if (selectedError) {
    console.error("[action:setProductionUsageStatus]", selectedError)
    return failure(selectedError.message)
  }
  if (!selectedRows || selectedRows.length === 0) {
    return failure("The selected usage lines were not found in this company.")
  }

  const rows = selectedRows as StatusRow[]
  const allIds = await expandBomComponentRows(supabase, companyId, workspaceId, rows)

  let targetUsageRowsQuery = supabase
    .from("production_usage")
    .select("id, batch_id, status, usage_date")
    .eq("company_id", companyId)
    .in("id", Array.from(allIds))
  if (workspaceId) {
    targetUsageRowsQuery = targetUsageRowsQuery.eq("workspace_id", workspaceId)
  }
  const { data: targetRows, error: targetError } = await targetUsageRowsQuery

  if (targetError) {
    console.error("[action:setProductionUsageStatus]", targetError)
    return failure(targetError.message)
  }

  // Cancel and restore are part of the same lock: outside the allowed window
  // nobody may change a usage line's lifecycle.
  const lockedRow = ((targetRows ?? []) as { usage_date: string }[]).find(
    (row) => isOutsideUsageWindow(row.usage_date, settings)
  )
  if (lockedRow) {
    return failure(lockedUsageDateMessage(lockedRow.usage_date, settings))
  }

  const now = new Date().toISOString()
  let usageStatusUpdateQuery = supabase
    .from("production_usage")
    .update({ status: input.status, updated_at: now })
    .eq("company_id", companyId)
    .in("id", Array.from(allIds))
  if (workspaceId) {
    usageStatusUpdateQuery = usageStatusUpdateQuery.eq("workspace_id", workspaceId)
  }
  const { error } = await usageStatusUpdateQuery

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

  const { supabase, companyId, workspaceId, userId, companyTimezone } =
    authorized.context
  const settings = await loadUsageSettings(supabase, companyId, workspaceId, companyTimezone)
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

  let ownUsageRowsQuery = supabase
    .from("production_usage")
    .select(
      "id, batch_id, sku_id, quantity, usage_date, notes, status, submitted_by, recorded_by"
    )
    .eq("company_id", companyId)
    .in("id", ids)
  if (workspaceId) {
    ownUsageRowsQuery = ownUsageRowsQuery.eq("workspace_id", workspaceId)
  }
  const { data: existingRows, error: existingError } = await ownUsageRowsQuery

  if (existingError) {
    console.error("[action:updateOwnProductionUsage]", existingError)
    return failure(existingError.message)
  }

  const rows = (existingRows ?? []) as OwnUsageRow[]
  if (rows.length !== ids.length) {
    return failure("One or more usage lines no longer exist in this company.")
  }

  // Moving a line to a different date must stay inside the allowed window.
  const nextUsageDate = input.usageDate?.trim()
  if (nextUsageDate && isOutsideUsageWindow(nextUsageDate, settings)) {
    return failure(lockedUsageDateMessage(nextUsageDate, settings))
  }

  for (const row of rows) {
    const owner = row.submitted_by ?? row.recorded_by
    if (owner !== userId) {
      return failure("You can only edit usage that you submitted.")
    }
    if (resolveUsageStatus(row, settings) === "cancelled") {
      return failure("Cancelled usage can no longer be edited.")
    }
    if (isOutsideUsageWindow(row.usage_date, settings)) {
      return failure(lockedUsageDateMessage(row.usage_date, settings))
    }
  }

  const now = new Date().toISOString()

  if (input.cancel) {
    const allIds = await expandBomComponentRows(supabase, companyId, workspaceId, rows)

    let affectedUsageRowsQuery = supabase
      .from("production_usage")
      .select("id, batch_id, status")
      .eq("company_id", companyId)
      .in("id", Array.from(allIds))
    if (workspaceId) {
      affectedUsageRowsQuery = affectedUsageRowsQuery.eq("workspace_id", workspaceId)
    }
    const { data: affectedRows, error: affectedError } = await affectedUsageRowsQuery

    if (affectedError) {
      console.error("[action:updateOwnProductionUsage]", affectedError)
      return failure(affectedError.message)
    }

    let cancelUsageUpdateQuery = supabase
      .from("production_usage")
      .update({ status: "cancelled", updated_at: now })
      .eq("company_id", companyId)
      .in("id", Array.from(allIds))
    if (workspaceId) {
      cancelUsageUpdateQuery = cancelUsageUpdateQuery.eq("workspace_id", workspaceId)
    }
    const { error } = await cancelUsageUpdateQuery

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

    let ownUsageUpdateQuery = supabase
      .from("production_usage")
      .update(payload)
      .eq("id", id)
      .eq("company_id", companyId)
    if (workspaceId) {
      ownUsageUpdateQuery = ownUsageUpdateQuery.eq("workspace_id", workspaceId)
    }
    const { error } = await ownUsageUpdateQuery

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
  "stage_sequence",
  "stage_name",
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
      row.stage?.sequence ?? "",
      row.stage?.name ?? "",
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

/**
 * Returns an empty CSV using the import headers. Leaving `batch_id` blank
 * creates a new usage entry; filling it updates the matching entry.
 */
export async function downloadProductionUsageTemplate(): Promise<
  ActionResult<ProductionUsageCsvExport>
> {
  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_EDITOR)
  if ("error" in authorized) return authorized.error

  return {
    success: true,
    data: {
      filename: "production-usage-import-template.csv",
      csv: toCsv(PRODUCTION_USAGE_CSV_HEADERS, []),
      rowCount: 0,
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
  created: number
  skipped: number
  conflicts: ProductionUsageImportConflict[]
}

type UsageImportRow = {
  id: string
  batch_id: string
  pipeline_id: string
  stage_id: string
  workspace_id: string
  sku_id: string | null
  quantity: number
  usage_date: string
  notes: string | null
  status: string
  updated_at: string
}

type UsageImportSku = {
  id: string
  sku_code: string
  uom: string | null
}

type UsageImportStage = {
  id: string
  pipeline_id: string
  sequence: number
  name: string
}

type UsageImportPipeline = {
  id: string
  code: string
  name: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Applies a usage CSV. Existing lines are updated in place and rows that do
 * not match an existing line are created, subject to the usage settings:
 * duplicate submissions are blocked unless the configuration allows them, and
 * a SKU can be resubmitted once every existing line for that stage, SKU and
 * date is cancelled.
 *
 * A blank `batch_id` creates a new usage entry (or updates the unique existing
 * line for the same stage, SKU and usage date). A provided `batch_id` updates
 * that entry, or creates a line inside it when the batch already exists.
 */
export async function importProductionUsageUpdates(input: {
  csv: string
}): Promise<ActionResult<ProductionUsageImportResult>> {
  if (!input.csv?.trim()) {
    return failure("Choose a CSV file with production usage rows.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.PRODUCTION_EDITOR)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId, companyTimezone } =
    authorized.context

  const parsed = parseCsv(input.csv)
  if (parsed.length < 2) {
    return failure(
      "The CSV must contain a header row and at least one usage line."
    )
  }

  const map = headerMap(parsed[0])
  if (!map.has("sku_code") || !map.has("quantity")) {
    return failure(
      "The CSV must include sku_code and quantity columns. Download the import template to get the right headers."
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
  const usageDates = Array.from(
    new Set(
      dataRows
        .map((row) => cell(row, map, "usage_date"))
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    )
  )

  const settings = await loadUsageSettings(supabase, companyId, workspaceId, companyTimezone)

  const [pipelinesResult, stagesResult, skusResult, assignmentsResult] =
    await Promise.all([
      workspaceId
        ? supabase
            .from("production_pipelines")
            .select("id, code, name")
            .eq("company_id", companyId)
            .eq("workspace_id", workspaceId)
        : supabase
            .from("production_pipelines")
            .select("id, code, name")
            .eq("company_id", companyId),
      workspaceId
        ? supabase
            .from("production_stages")
            .select("id, pipeline_id, sequence, name")
            .eq("company_id", companyId)
            .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
        : supabase
            .from("production_stages")
            .select("id, pipeline_id, sequence, name")
            .eq("company_id", companyId),
      workspaceId
        ? supabase
            .from("skus")
            .select("id, sku_code, uom")
            .eq("company_id", companyId)
            .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
        : supabase
            .from("skus")
            .select("id, sku_code, uom")
            .eq("company_id", companyId),
      workspaceId
        ? supabase
            .from("production_stage_skus")
            .select("stage_id, sku_id")
            .eq("company_id", companyId)
            .or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`)
        : supabase
            .from("production_stage_skus")
            .select("stage_id, sku_id")
            .eq("company_id", companyId),
    ])

  if (pipelinesResult.error) {
    console.error(
      "[action:importProductionUsageUpdates]",
      pipelinesResult.error
    )
    return failure(pipelinesResult.error.message)
  }
  if (stagesResult.error) {
    console.error("[action:importProductionUsageUpdates]", stagesResult.error)
    return failure(stagesResult.error.message)
  }
  if (skusResult.error) {
    console.error("[action:importProductionUsageUpdates]", skusResult.error)
    return failure(skusResult.error.message)
  }
  if (assignmentsResult.error) {
    console.error(
      "[action:importProductionUsageUpdates]",
      assignmentsResult.error
    )
    return failure(assignmentsResult.error.message)
  }

  const [byBatchResult, byDateResult] = await Promise.all([
    batchIds.length > 0
      ? (workspaceId
          ? supabase
              .from("production_usage")
              .select(
                "id, batch_id, pipeline_id, stage_id, workspace_id, sku_id, quantity, usage_date, notes, status, updated_at"
              )
              .eq("company_id", companyId)
              .eq("workspace_id", workspaceId)
              .in("batch_id", batchIds)
          : supabase
              .from("production_usage")
              .select(
                "id, batch_id, pipeline_id, stage_id, workspace_id, sku_id, quantity, usage_date, notes, status, updated_at"
              )
              .eq("company_id", companyId)
              .in("batch_id", batchIds))
      : Promise.resolve({ data: [], error: null }),
    usageDates.length > 0
      ? (workspaceId
          ? supabase
              .from("production_usage")
              .select(
                "id, batch_id, pipeline_id, stage_id, workspace_id, sku_id, quantity, usage_date, notes, status, updated_at"
              )
              .eq("company_id", companyId)
              .eq("workspace_id", workspaceId)
              .in("usage_date", usageDates)
          : supabase
              .from("production_usage")
              .select(
                "id, batch_id, pipeline_id, stage_id, workspace_id, sku_id, quantity, usage_date, notes, status, updated_at"
              )
              .eq("company_id", companyId)
              .in("usage_date", usageDates))
      : Promise.resolve({ data: [], error: null }),
  ])

  if (byBatchResult.error || byDateResult.error) {
    const error = byBatchResult.error ?? byDateResult.error
    console.error("[action:importProductionUsageUpdates]", error)
    return failure(error?.message ?? "Could not load the existing usage.")
  }

  const usageRowsById = new Map<string, UsageImportRow>()
  for (const row of [
    ...((byBatchResult.data ?? []) as UsageImportRow[]),
    ...((byDateResult.data ?? []) as UsageImportRow[]),
  ]) {
    usageRowsById.set(row.id, row)
  }
  const usageRows = Array.from(usageRowsById.values())

  const usageByBatchSku = new Map<string, UsageImportRow>()
  const batchById = new Map<string, UsageImportRow>()
  for (const row of usageRows) {
    if (row.sku_id) usageByBatchSku.set(`${row.batch_id}:${row.sku_id}`, row)
    if (!batchById.has(row.batch_id)) batchById.set(row.batch_id, row)
  }

  const skuByCode = new Map<string, UsageImportSku>()
  for (const sku of (skusResult.data ?? []) as UsageImportSku[]) {
    skuByCode.set(sku.sku_code.toUpperCase(), sku)
  }

  const pipelines = (pipelinesResult.data ?? []) as UsageImportPipeline[]
  const pipelineByCode = new Map(
    pipelines.map((pipeline) => [pipeline.code.toUpperCase(), pipeline])
  )
  const stages = (stagesResult.data ?? []) as UsageImportStage[]

  const assignmentKeys = new Set(
    ((assignmentsResult.data ?? []) as {
      stage_id: string
      sku_id: string
    }[]).map((row) => `${row.stage_id}:${row.sku_id}`)
  )

  const conflicts: ProductionUsageImportConflict[] = []
  const changelog: UsageChangelogInput[] = []
  const seen = new Set<string>()
  let updated = 0
  let created = 0
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
    // cancel the affected line or open it for a manual correction.
    const conflict = (
      reason: string,
      usageRow: UsageImportRow | null = null
    ) => {
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

    if (!skuCode) {
      conflict("sku_code is required.")
      continue
    }

    if (
      quantityText === "" ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity < 0
    ) {
      conflict("quantity must be a number greater than or equal to 0.")
      continue
    }
    const quantity = parsedQuantity

    const sku = skuByCode.get(skuCode.toUpperCase())
    if (!sku) {
      conflict(`Unknown SKU code "${skuCode}".`)
      continue
    }

    const batchRow = batchId ? batchById.get(batchId) : undefined
    const batchSkuKey = batchId ? `${batchId}:${sku.id}` : ""
    let usageRow = batchId ? usageByBatchSku.get(batchSkuKey) : undefined

    // The status column drives the lifecycle. Cancelled lines are read-only,
    // so a row can only be restored (status = submitted) before it is edited.
    const statusText = map.has("status")
      ? cell(row, map, "status").toLowerCase()
      : ""
    const desiredStatus: "submitted" | "cancelled" | null | undefined =
      statusText === "cancelled" || statusText === "cancellation"
        ? "cancelled"
        : statusText === "submitted" ||
            statusText === "completed" ||
            statusText === ""
          ? statusText === ""
            ? null
            : "submitted"
          : undefined

    if (desiredStatus === undefined) {
      conflict(
        `Unknown status "${statusText}". Use submitted or cancelled.`,
        usageRow ?? null
      )
      continue
    }

    // If the CSV has no batch id, update the unique existing line for the same
    // stage, SKU and date instead of creating a duplicate.
    let resolvedStageId = batchRow?.stage_id ?? ""
    let resolvedPipelineId = batchRow?.pipeline_id ?? ""
    const resolvedDate =
      usageDateText || batchRow?.usage_date?.slice(0, 10) || ""
    const resolvedWorkspaceId = batchRow?.workspace_id ?? workspaceId

    if (!resolvedStageId) {
      const pipelineCode = cell(row, map, "pipeline_code")
      const pipeline = pipelineCode
        ? pipelineByCode.get(pipelineCode.toUpperCase())
        : undefined
      if (pipelineCode && !pipeline) {
        conflict(`Unknown pipeline code "${pipelineCode}".`)
        continue
      }

      const sequenceText = cell(row, map, "stage_sequence")
      const stageName = cell(row, map, "stage_name")
      const legacyStage = cell(row, map, "stage")
      const legacySequence = legacyStage
        ? Number(legacyStage.split(".")[0])
        : Number.NaN
      const parsedSequence = sequenceText
        ? Number(sequenceText)
        : legacySequence
      const sequence = Number.isFinite(parsedSequence)
        ? parsedSequence
        : null
      const name =
        stageName ||
        (legacyStage ? legacyStage.replace(/^\d+\.\s*/, "") : "")

      const candidates = stages.filter(
        (stage) =>
          (!pipeline || stage.pipeline_id === pipeline.id) &&
          (sequence === null || stage.sequence === sequence) &&
          (!name || stage.name.toLowerCase() === name.toLowerCase())
      )

      if (candidates.length === 0) {
        conflict(
          "Could not resolve the stage. Provide pipeline_code and stage_sequence (or stage_name) for a new usage row."
        )
        continue
      }
      if (candidates.length > 1) {
        conflict(
          "The stage is ambiguous. Add pipeline_code or stage_sequence to identify it."
        )
        continue
      }

      resolvedStageId = candidates[0].id
      resolvedPipelineId = candidates[0].pipeline_id
    }

    if (!usageRow && !batchId) {
      const matches = usageRows.filter(
        (candidate) =>
          candidate.sku_id === sku.id &&
          candidate.stage_id === resolvedStageId &&
          candidate.usage_date.slice(0, 10) === resolvedDate
      )
      if (matches.length === 1) {
        usageRow = matches[0]
      } else if (matches.length > 1) {
        conflict(
          "Multiple usage lines match this stage, SKU and date. Add batch_id to identify the line."
        )
        continue
      }
    }

    if (usageRow) {
      // Imports may not bypass the allowed window, even for usage editors.
      if (isOutsideUsageWindow(usageRow.usage_date, settings)) {
        conflict(
          lockedUsageDateMessage(usageRow.usage_date, settings),
          usageRow
        )
        continue
      }

      const lineKey = `${usageRow.batch_id}:${usageRow.sku_id ?? usageRow.id}`
      if (seen.has(lineKey)) {
        conflict("Duplicate row for the same batch and SKU.", usageRow)
        continue
      }
      seen.add(lineKey)

      if (statusText === "" && usageRow.status === "cancelled") {
        conflict(
          "This usage line was cancelled. Set its status to submitted to restore it first.",
          usageRow
        )
        continue
      }

      if (usageRow.status === "cancelled" && desiredStatus !== "submitted") {
        skipped += 1
        continue
      }

      if (desiredStatus === "cancelled") {
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
          conflict(
            "This line was modified after the CSV was exported.",
            usageRow
          )
          continue
        }

        const affectedIds = await expandBomComponentRows(supabase, companyId, workspaceId, [
          usageRow,
        ])

        let affectedUsageRowsQuery = supabase
          .from("production_usage")
          .select("id, batch_id, status")
          .eq("company_id", companyId)
          .in("id", Array.from(affectedIds))
        if (workspaceId) {
          affectedUsageRowsQuery = affectedUsageRowsQuery.eq("workspace_id", workspaceId)
        }
        const { data: affectedRows, error: affectedError } = await affectedUsageRowsQuery

        if (affectedError) {
          console.error(
            "[action:importProductionUsageUpdates]",
            affectedError
          )
          conflict(
            `Could not cancel the line: ${affectedError.message}`,
            usageRow
          )
          continue
        }

        let importCancelUpdateQuery = supabase
          .from("production_usage")
          .update({ status: "cancelled", updated_at: now })
          .eq("company_id", companyId)
          .in("id", Array.from(affectedIds))
        if (workspaceId) {
          importCancelUpdateQuery = importCancelUpdateQuery.eq("workspace_id", workspaceId)
        }
        const { error } = await importCancelUpdateQuery

        if (error) {
          console.error("[action:importProductionUsageUpdates]", error)
          conflict(`Could not cancel the line: ${error.message}`, usageRow)
          continue
        }

        for (const target of (affectedRows ?? []) as {
          id: string
          batch_id: string | null
          status: string
        }[]) {
          if (target.status === "cancelled") continue
          changelog.push({
            usage_id: target.id,
            batch_id: target.batch_id,
            action: "import",
            previous_values: { status: target.status },
            new_values: { status: "cancelled" },
            reason:
              target.id === usageRow.id
                ? "Cancelled through a usage import."
                : "Cancelled as a BOM component through a usage import.",
          })
        }

        updated += 1
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

      const usageDate = resolvedDate || usageRow.usage_date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(usageDate)) {
        conflict("usage_date must use the YYYY-MM-DD format.", usageRow)
        continue
      }
      if (isOutsideUsageWindow(usageDate, settings)) {
        conflict(lockedUsageDateMessage(usageDate, settings), usageRow)
        continue
      }

      const notes = map.has("notes")
        ? cell(row, map, "notes") || null
        : usageRow.notes
      const nextStatus =
        usageRow.status === "cancelled" ? "submitted" : usageRow.status
      const dateChanged =
        usageDate !== usageRow.usage_date.slice(0, 10)

      // A restored line and a line moved to another date can collide with an
      // active line, so the duplicate rule applies to updates as well.
      if (
        !settings.allowDuplicates &&
        (dateChanged || usageRow.status === "cancelled")
      ) {
        let duplicateUsageQuery = supabase
          .from("production_usage")
          .select("id")
          .eq("company_id", companyId)
          .eq("stage_id", usageRow.stage_id)
          .eq("sku_id", usageRow.sku_id)
          .eq("usage_date", usageDate)
          .neq("id", usageRow.id)
          .neq("status", "cancelled")
          .limit(1)
        if (workspaceId) {
          duplicateUsageQuery = duplicateUsageQuery.eq("workspace_id", workspaceId)
        }
        const { data: duplicateRows, error: duplicateError } = await duplicateUsageQuery

        if (duplicateError) {
          console.error(
            "[action:importProductionUsageUpdates]",
            duplicateError
          )
          conflict(
            `Could not check existing usage: ${duplicateError.message}`,
            usageRow
          )
          continue
        }

        if ((duplicateRows ?? []).length > 0) {
          conflict(
            `Active usage already exists for this SKU on ${usageDate}. Cancel it first or enable duplicate usage in the settings.`,
            usageRow
          )
          continue
        }
      }

      let importUsageUpdateQuery = supabase
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
      if (workspaceId) {
        importUsageUpdateQuery = importUsageUpdateQuery.eq("workspace_id", workspaceId)
      }
      const { error } = await importUsageUpdateQuery

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
      continue
    }

    // No existing line matches: create it, subject to the duplicate rules and
    // stage assignment.
    if (desiredStatus === "cancelled") {
      conflict("Cannot create a new line with a cancelled status.")
      continue
    }

    if (!resolvedDate) {
      conflict("usage_date is required for a new usage row.")
      continue
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
      conflict("usage_date must use the YYYY-MM-DD format.")
      continue
    }
    if (isOutsideUsageWindow(resolvedDate, settings)) {
      conflict(lockedUsageDateMessage(resolvedDate, settings))
      continue
    }
    if (!resolvedStageId || !resolvedPipelineId) {
      conflict(
        "Could not resolve the pipeline and stage for a new usage row. Provide pipeline_code and stage_sequence."
      )
      continue
    }
    if (!resolvedWorkspaceId) {
      conflict("No workspace is associated with your account.")
      continue
    }
    if (!assignmentKeys.has(`${resolvedStageId}:${sku.id}`)) {
      conflict(`SKU "${sku.sku_code}" is not assigned to the resolved stage.`)
      continue
    }

    const newBatchId = batchId || randomUUID()
    if (batchId && !UUID_PATTERN.test(batchId)) {
      conflict("batch_id must be a valid UUID when it is provided.")
      continue
    }

    const duplicateKey = `${newBatchId}:${sku.id}`
    if (seen.has(duplicateKey)) {
      conflict("Duplicate row for the same batch and SKU.")
      continue
    }
    seen.add(duplicateKey)

    if (!settings.allowDuplicates) {
      const { data: activeRows, error: activeError } = await supabase
        .from("production_usage")
        .select("id")
        .eq("company_id", companyId)
        .eq("stage_id", resolvedStageId)
        .eq("sku_id", sku.id)
        .eq("usage_date", resolvedDate)
        .neq("status", "cancelled")
        .limit(1)

      if (activeError) {
        console.error("[action:importProductionUsageUpdates]", activeError)
        conflict(`Could not check existing usage: ${activeError.message}`)
        continue
      }
      if ((activeRows ?? []).length > 0) {
        conflict(
          `Active usage already exists for ${sku.sku_code} on ${resolvedDate}. Cancel it first or enable duplicate usage in the settings.`
        )
        continue
      }
    }

    const notes = map.has("notes") ? cell(row, map, "notes") || null : null

    const { data: inserted, error } = await supabase
      .from("production_usage")
      .insert({
        company_id: companyId,
        workspace_id: resolvedWorkspaceId,
        pipeline_id: resolvedPipelineId,
        stage_id: resolvedStageId,
        batch_id: newBatchId,
        sku_id: sku.id,
        quantity,
        uom: sku.uom || null,
        usage_date: resolvedDate,
        notes,
        status: "submitted",
        submitted_by: userId,
        recorded_by: userId,
        recorded_at: now,
        updated_at: now,
      })
      .select("id")
      .single()

    if (error || !inserted) {
      console.error("[action:importProductionUsageUpdates]", error)
      conflict(`Could not add the line: ${error?.message ?? "unknown error"}`)
      continue
    }

    changelog.push({
      usage_id: (inserted as { id: string }).id,
      batch_id: newBatchId,
      action: "import",
      new_values: {
        sku_id: sku.id,
        quantity,
        usage_date: resolvedDate,
        notes,
        status: "submitted",
      },
      reason: "Added through a usage import.",
    })

    created += 1
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
      summary: `Imported production usage: ${updated} updated, ${created} added, ${conflicts.length} conflict(s)`,
      metadata: {
        updated,
        created,
        skipped,
        conflict_count: conflicts.length,
      },
    }
  )

  revalidateUsageEditorPaths()

  return { success: true, data: { updated, created, skipped, conflicts } }
}
