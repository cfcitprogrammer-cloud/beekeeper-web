"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getActionContext,
  getAuthorizedContext,
  type ActionContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { logActivity } from "@/actions/helpers/activity"
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions"

const PLAN_STATUSES = ["draft", "active", "completed", "cancelled"] as const

function planStatus(value?: string) {
  const normalized = String(value ?? "").toLowerCase()
  return (PLAN_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as (typeof PLAN_STATUSES)[number])
    : "draft"
}

function dateError(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Start and end dates are required."
  if (endDate < startDate) return "The end date cannot be before the start date."
  return null
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const radius = 6371000
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * radius * Math.asin(Math.sqrt(a)) * 100) / 100
}

async function findMatchingPlan(
  supabase: ActionContext["supabase"],
  companyId: string,
  employeeId: string,
  outletId: string,
  date: string
): Promise<string | null> {
  const { data: plans, error } = await supabase
    .from("visit_plans")
    .select("id")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .in("status", ["draft", "active"])
    .lte("start_date", date)
    .gte("end_date", date)

  if (error || !plans || plans.length === 0) return null

  const planIds = (plans as { id: string }[]).map((plan) => plan.id)
  const { data: targets } = await supabase
    .from("visit_plan_outlets")
    .select("plan_id")
    .eq("company_id", companyId)
    .eq("outlet_id", outletId)
    .in("plan_id", planIds)
    .limit(1)

  return (targets?.[0]?.plan_id as string | undefined) ?? null
}

export type CreateVisitPlanInput = {
  employeeId: string
  name: string
  startDate: string
  endDate: string
  notes?: string
  status?: string
  outletIds?: string[]
}

export async function createVisitPlan(
  input: CreateVisitPlanInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.employeeId) return failure("Select an employee.")
  if (!input.name.trim()) return failure("A visit plan name is required.")
  const rangeError = dateError(input.startDate, input.endDate)
  if (rangeError) return failure(rangeError)

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", input.employeeId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (employeeError) return failure(employeeError.message)
  if (!employee) return failure("Employee not found in this company.")

  const { data, error } = await supabase
    .from("visit_plans")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      employee_id: input.employeeId,
      name: input.name.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes?.trim() || null,
      status: planStatus(input.status),
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createVisitPlan]", error)
    return failure(error.message)
  }

  const outletIds = Array.from(new Set((input.outletIds ?? []).filter(Boolean)))
  if (outletIds.length > 0) {
    const { data: outlets, error: outletError } = await supabase
      .from("outlets")
      .select("id")
      .eq("company_id", companyId)
      .in("id", outletIds)
    if (outletError) return failure(outletError.message)
    const validIds = new Set(
      ((outlets ?? []) as { id: string }[]).map((outlet) => outlet.id)
    )
    if (validIds.size > 0) {
      const { error: targetError } = await supabase.from("visit_plan_outlets").insert(
        Array.from(validIds).map((outletId) => ({
          company_id: companyId,
          plan_id: data.id,
          outlet_id: outletId,
        }))
      )
      if (targetError) {
        await supabase.from("visit_plans").delete().eq("id", data.id)
        return failure(targetError.message)
      }
    }
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "create",
      entityType: "visit_plan",
      entityId: data.id,
      summary: `Created visit plan ${input.name.trim()}`,
      metadata: { employee_id: input.employeeId, outlet_count: outletIds.length },
    }
  )

  revalidatePath("/visits")
  revalidatePath("/feed")

  return { success: true, data }
}

export type UpdateVisitPlanInput = CreateVisitPlanInput & { id: string }

export async function updateVisitPlan(
  input: UpdateVisitPlanInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Visit plan id is required.")
  if (!input.name.trim()) return failure("A visit plan name is required.")
  const rangeError = dateError(input.startDate, input.endDate)
  if (rangeError) return failure(rangeError)

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("visit_plans")
    .update({
      employee_id: input.employeeId || undefined,
      name: input.name.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes?.trim() || null,
      status: planStatus(input.status),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateVisitPlan]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "visit_plan",
      entityId: data.id,
      summary: `Updated visit plan ${input.name.trim()}`,
    }
  )

  revalidatePath("/visits")
  revalidatePath("/feed")

  return { success: true, data }
}

export async function deleteVisitPlan(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Visit plan id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { error } = await supabase
    .from("visit_plans")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteVisitPlan]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "delete",
      entityType: "visit_plan",
      entityId: id,
      summary: "Deleted a visit plan",
    }
  )

  revalidatePath("/visits")
  revalidatePath("/feed")

  return { success: true, data: { id } }
}

export type AddVisitTargetInput = {
  planId: string
  outletId: string
  plannedDate?: string
  notes?: string
}

export async function addVisitPlanOutlet(
  input: AddVisitTargetInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.planId || !input.outletId) {
    return failure("Select a plan and an outlet.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const [planResult, outletResult] = await Promise.all([
    supabase
      .from("visit_plans")
      .select("id")
      .eq("id", input.planId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("outlets")
      .select("id")
      .eq("id", input.outletId)
      .eq("company_id", companyId)
      .maybeSingle(),
  ])

  if (planResult.error) return failure(planResult.error.message)
  if (!planResult.data) return failure("Visit plan not found in this company.")
  if (outletResult.error) return failure(outletResult.error.message)
  if (!outletResult.data) return failure("Outlet not found in this company.")

  const { data, error } = await supabase
    .from("visit_plan_outlets")
    .insert({
      company_id: companyId,
      plan_id: input.planId,
      outlet_id: input.outletId,
      planned_date: input.plannedDate || null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return failure("This outlet is already a target of the visit plan.")
    }
    console.error("[action:addVisitPlanOutlet]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "create",
      entityType: "visit_plan_outlet",
      entityId: data.id,
      summary: "Added a target outlet to a visit plan",
      metadata: { plan_id: input.planId, outlet_id: input.outletId },
    }
  )

  revalidatePath("/visits")
  revalidatePath("/feed")

  return { success: true, data }
}

export async function removeVisitPlanOutlet(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Target id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { error } = await supabase
    .from("visit_plan_outlets")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:removeVisitPlanOutlet]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "delete",
      entityType: "visit_plan_outlet",
      entityId: id,
      summary: "Removed a target outlet from a visit plan",
    }
  )

  revalidatePath("/visits")
  revalidatePath("/feed")

  return { success: true, data: { id } }
}

export type CheckInVisitInput = {
  employeeId: string
  outletId: string
  planId?: string
  latitude?: number
  longitude?: number
  notes?: string
  checkInAt?: string
}

export async function checkInVisit(
  input: CheckInVisitInput
): Promise<ActionResult<{ id: string; is_planned: boolean; plan_id: string | null }>> {
  if (!input.employeeId || !input.outletId) {
    return failure("Select an employee and an outlet.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_CREATE)
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
      .select("id, latitude, longitude")
      .eq("id", input.outletId)
      .eq("company_id", companyId)
      .maybeSingle(),
  ])

  if (employeeResult.error) return failure(employeeResult.error.message)
  if (!employeeResult.data) return failure("Employee not found in this company.")
  if (outletResult.error) return failure(outletResult.error.message)
  if (!outletResult.data) return failure("Outlet not found in this company.")

  const checkInAt = input.checkInAt || new Date().toISOString()
  const visitDate = checkInAt.slice(0, 10)
  const matchedPlanId = await findMatchingPlan(
    supabase,
    companyId,
    input.employeeId,
    input.outletId,
    visitDate
  )

  const requestedPlanId = input.planId?.trim() || null
  const planId = matchedPlanId ?? null
  const isPlanned = planId !== null

  let distance: number | null = null
  if (
    typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    typeof outletResult.data.latitude === "number" &&
    typeof outletResult.data.longitude === "number"
  ) {
    distance = haversineMeters(
      input.latitude,
      input.longitude,
      outletResult.data.latitude,
      outletResult.data.longitude
    )
  }

  const { data, error } = await supabase
    .from("visits")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      employee_id: input.employeeId,
      outlet_id: input.outletId,
      plan_id: planId,
      is_planned: isPlanned,
      planned_date: isPlanned ? visitDate : null,
      check_in_at: checkInAt,
      check_in_latitude: input.latitude ?? null,
      check_in_longitude: input.longitude ?? null,
      check_in_distance_m: distance,
      notes: input.notes?.trim() || null,
      status: "checked_in",
      created_by: userId,
    })
    .select("id, is_planned, plan_id")
    .single()

  if (error) {
    console.error("[action:checkInVisit]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "check_in",
      entityType: "visit",
      entityId: data.id,
      summary: `${isPlanned ? "Planned" : "Unplanned"} visit check-in`,
      metadata: {
        employee_id: input.employeeId,
        outlet_id: input.outletId,
        plan_id: planId,
        requested_plan_id: requestedPlanId,
        distance_m: distance,
      },
    }
  )

  revalidatePath("/visits")
  revalidatePath("/feed")

  return { success: true, data }
}

export type CheckOutVisitInput = {
  visitId: string
  latitude?: number
  longitude?: number
  notes?: string
}

export async function checkOutVisit(
  input: CheckOutVisitInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.visitId) return failure("Visit id is required.")

  const context = await getActionContext()
  if (!context.userId) return failure("You must be signed in.")
  if (!context.companyId) return failure("No company is associated with your account.")

  const { data: visit, error: visitError } = await context.supabase
    .from("visits")
    .select("id, company_id, employee_id, check_out_at, outlet_id")
    .eq("id", input.visitId)
    .eq("company_id", context.companyId)
    .maybeSingle()

  if (visitError) return failure(visitError.message)
  if (!visit) return failure("Visit not found in this company.")
  if (visit.check_out_at) return failure("This visit has already been checked out.")

  const isSelf = context.employee?.id === visit.employee_id
  if (
    !isSelf &&
    !hasPermission(context.permissions, PERMISSIONS.VISITS_UPDATE)
  ) {
    return failure("You do not have permission to check out this visit.")
  }

  const now = new Date().toISOString()
  const { error } = await context.supabase
    .from("visits")
    .update({
      check_out_at: now,
      check_out_latitude: input.latitude ?? null,
      check_out_longitude: input.longitude ?? null,
      notes: input.notes?.trim() || null,
      status: "checked_out",
      updated_at: now,
    })
    .eq("id", input.visitId)
    .eq("company_id", context.companyId)

  if (error) {
    console.error("[action:checkOutVisit]", error)
    return failure(error.message)
  }

  await logActivity(
    context.supabase,
    {
      companyId: context.companyId,
      workspaceId: context.workspaceId,
      userId: context.userId,
    },
    context.employee?.id ?? null,
    {
      action: "check_out",
      entityType: "visit",
      entityId: input.visitId,
      summary: "Checked out of a visit",
      metadata: { outlet_id: visit.outlet_id },
    }
  )

  revalidatePath("/visits")
  revalidatePath("/feed")

  return { success: true, data: { id: input.visitId } }
}

export async function cancelVisit(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Visit id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context
  const { error } = await supabase
    .from("visits")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:cancelVisit]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "cancel",
      entityType: "visit",
      entityId: id,
      summary: "Cancelled a visit",
    }
  )

  revalidatePath("/visits")
  revalidatePath("/feed")

  return { success: true, data: { id } }
}
