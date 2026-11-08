"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { logActivity } from "@/actions/helpers/activity"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type AssignOutletsInput = {
  employeeId: string
  outletIds: string[]
  notes?: string
}

export async function assignOutlets(
  input: AssignOutletsInput
): Promise<ActionResult<{ assigned: number; skipped: number }>> {
  if (!input.employeeId) return failure("Select an employee.")
  const outletIds = Array.from(new Set(input.outletIds.filter(Boolean)))
  if (outletIds.length === 0) return failure("Select at least one outlet.")

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const [employeeResult, outletResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id")
      .eq("id", input.employeeId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("outlets")
      .select("id")
      .in("id", outletIds)
      .eq("company_id", companyId),
  ])

  if (employeeResult.error) return failure(employeeResult.error.message)
  if (!employeeResult.data) return failure("Employee not found in this company.")
  if (outletResult.error) return failure(outletResult.error.message)

  const validOutletIds = new Set(
    ((outletResult.data ?? []) as { id: string }[]).map((outlet) => outlet.id)
  )
  if (validOutletIds.size === 0) {
    return failure("None of the selected outlets belong to this company.")
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("employee_outlet_assignments")
    .select("id, outlet_id, is_active")
    .eq("company_id", companyId)
    .eq("employee_id", input.employeeId)
    .in("outlet_id", Array.from(validOutletIds))

  if (existingError) return failure(existingError.message)

  const existing = new Map(
    ((existingRows ?? []) as { id: string; outlet_id: string; is_active: boolean }[]).map(
      (row) => [row.outlet_id, row]
    )
  )

  const now = new Date().toISOString()
  const toReactivate: string[] = []
  const toInsert: Record<string, unknown>[] = []
  let alreadyActive = 0

  for (const outletId of validOutletIds) {
    const row = existing.get(outletId)
    if (!row) {
      toInsert.push({
        company_id: companyId,
        workspace_id: workspaceId,
        employee_id: input.employeeId,
        outlet_id: outletId,
        assigned_by: userId,
        assigned_at: now,
        notes: input.notes?.trim() || null,
        is_active: true,
      })
    } else if (row.is_active) {
      alreadyActive += 1
    } else {
      toReactivate.push(row.id)
    }
  }

  if (toReactivate.length > 0) {
    const { error: reactivateError } = await supabase
      .from("employee_outlet_assignments")
      .update({
        is_active: true,
        unassigned_at: null,
        assigned_by: userId,
        assigned_at: now,
        notes: input.notes?.trim() || null,
        updated_at: now,
      })
      .in("id", toReactivate)
      .eq("company_id", companyId)
    if (reactivateError) return failure(reactivateError.message)
  }

  let inserted = 0
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("employee_outlet_assignments")
      .insert(toInsert)
      .select("id")
    if (error) {
      console.error("[action:assignOutlets]", error)
      return failure(error.message)
    }
    inserted = data?.length ?? 0
  }

  const assigned = inserted + toReactivate.length
  const skipped = outletIds.length - validOutletIds.size + alreadyActive

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "assign",
      entityType: "employee_outlet_assignment",
      entityId: input.employeeId,
      summary: `Assigned ${assigned} outlet(s) to an employee`,
      metadata: { employee_id: input.employeeId, outlet_ids: Array.from(validOutletIds) },
    }
  )

  revalidatePath("/outlets/assignments")
  revalidatePath("/outlets")
  revalidatePath("/feed")

  return { success: true, data: { assigned, skipped } }
}

export async function unassignOutlet(
  assignmentId: string
): Promise<ActionResult<{ id: string }>> {
  if (!assignmentId) return failure("Assignment id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  const { data, error } = await supabase
    .from("employee_outlet_assignments")
    .update({
      is_active: false,
      unassigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("company_id", companyId)
    .select("id, employee_id, outlet_id")
    .single()

  if (error) {
    console.error("[action:unassignOutlet]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "unassign",
      entityType: "employee_outlet_assignment",
      entityId: assignmentId,
      summary: "Removed an outlet assignment",
      metadata: { employee_id: data.employee_id, outlet_id: data.outlet_id },
    }
  )

  revalidatePath("/outlets/assignments")
  revalidatePath("/feed")

  return { success: true, data: { id: assignmentId } }
}

export async function reactivateOutletAssignment(
  assignmentId: string
): Promise<ActionResult<{ id: string }>> {
  if (!assignmentId) return failure("Assignment id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  const { data, error } = await supabase
    .from("employee_outlet_assignments")
    .update({
      is_active: true,
      unassigned_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:reactivateOutletAssignment]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "restore",
      entityType: "employee_outlet_assignment",
      entityId: assignmentId,
      summary: "Reactivated an outlet assignment",
    }
  )

  revalidatePath("/outlets/assignments")
  revalidatePath("/feed")

  return { success: true, data }
}
