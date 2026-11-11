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

function timeError(
  startDate: string,
  endDate: string,
  startTime?: string,
  endTime?: string
) {
  if (!startTime || !endTime) return null
  if (startDate === endDate && endTime < startTime) {
    return "The end time cannot be before the start time on the same day."
  }
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

function photoBelongsToVisit(
  photoPath: string,
  companyId: string,
  visitId: string
) {
  return photoPath.startsWith(`${companyId}/${visitId}/`)
}

/**
 * Every visit scheduled inside a plan's date range is attached to that plan.
 * Visits that were attached previously but now fall outside the range are
 * detached. The database trigger re-validates the attachment.
 */
async function syncPlanVisits(
  supabase: ActionContext["supabase"],
  companyId: string,
  plan: {
    id: string
    employee_id: string
    start_date: string
    end_date: string
  }
) {
  const now = new Date().toISOString()

  const { error: detachError } = await supabase
    .from("visits")
    .update({
      plan_id: null,
      is_planned: false,
      planned_date: null,
      updated_at: now,
    })
    .eq("company_id", companyId)
    .eq("plan_id", plan.id)

  if (detachError) {
    console.error("[action:syncPlanVisits:detach]", detachError)
    return
  }

  const { error: attachError } = await supabase
    .from("visits")
    .update({
      plan_id: plan.id,
      is_planned: true,
      planned_date: null,
      updated_at: now,
    })
    .eq("company_id", companyId)
    .eq("employee_id", plan.employee_id)
    .gte("start_date", plan.start_date)
    .lte("start_date", plan.end_date)
    .neq("status", "cancelled")

  if (attachError) {
    console.error("[action:syncPlanVisits:attach]", attachError)
  }
}

function revalidateVisitPages() {
  revalidatePath("/visits")
  revalidatePath("/visits/plans")
  revalidatePath("/visits/log")
  revalidatePath("/visits/plans/[id]", "page")
  revalidatePath("/feed")
}

export type CreateVisitPlanInput = {
  name: string
  startDate: string
  endDate: string
  notes?: string
  status?: string
}

export async function createVisitPlan(
  input: CreateVisitPlanInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim()) return failure("A visit plan name is required.")
  const rangeError = dateError(input.startDate, input.endDate)
  if (rangeError) return failure(rangeError)

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId, employee } =
    authorized.context
  if (!employee) {
    return failure(
      "Your account is not linked to an employee record. Ask an administrator to link it before creating visit plans."
    )
  }

  const planWorkspaceId = employee.workspace_id || workspaceId

  // Status is intentionally omitted: the database default applies on create.
  const { data, error } = await supabase
    .from("visit_plans")
    .insert({
      company_id: companyId,
      workspace_id: planWorkspaceId,
      employee_id: employee.id,
      name: input.name.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createVisitPlan]", error)
    return failure(error.message)
  }

  await syncPlanVisits(supabase, companyId, {
    id: data.id,
    employee_id: employee.id,
    start_date: input.startDate,
    end_date: input.endDate,
  })

  await logActivity(
    supabase,
    { companyId, workspaceId: planWorkspaceId, userId },
    employee.id,
    {
      action: "create",
      entityType: "visit_plan",
      entityId: data.id,
      summary: `Created visit plan ${input.name.trim()}`,
      metadata: { employee_id: employee.id },
    }
  )

  revalidateVisitPages()

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
      name: input.name.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      notes: input.notes?.trim() || null,
      status: planStatus(input.status),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id, employee_id")
    .single()

  if (error) {
    console.error("[action:updateVisitPlan]", error)
    return failure(error.message)
  }

  await syncPlanVisits(supabase, companyId, {
    id: data.id,
    employee_id: data.employee_id,
    start_date: input.startDate,
    end_date: input.endDate,
  })

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

  revalidateVisitPages()

  return { success: true, data: { id: data.id } }
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

  revalidateVisitPages()

  return { success: true, data: { id } }
}

export type CreateVisitInput = {
  outletId: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  notes?: string
}

/**
 * Add a visit to the log before it happens. The visit starts with the database
 * default status (`scheduled`); check-in and check-out happen later from the
 * visit log, each with a required captured photo.
 */
export async function createVisit(
  input: CreateVisitInput
): Promise<ActionResult<{ id: string; is_planned: boolean; plan_id: string | null }>> {
  if (!input.outletId) return failure("Select an outlet.")
  const rangeError = dateError(input.startDate, input.endDate)
  if (rangeError) return failure(rangeError)
  const timeRangeError = timeError(
    input.startDate,
    input.endDate,
    input.startTime,
    input.endTime
  )
  if (timeRangeError) return failure(timeRangeError)

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId, employee } =
    authorized.context
  if (!employee) {
    return failure(
      "Your account is not linked to an employee record. Ask an administrator to link it before adding visits."
    )
  }

  const visitWorkspaceId = employee.workspace_id || workspaceId

  const { data: outlet, error: outletError } = await supabase
    .from("outlets")
    .select("id")
    .eq("id", input.outletId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (outletError) return failure(outletError.message)
  if (!outlet) return failure("Outlet not found in this company.")

  // Status and classification are intentionally omitted: the database defaults
  // and classification trigger decide them.
  const { data, error } = await supabase
    .from("visits")
    .insert({
      company_id: companyId,
      workspace_id: visitWorkspaceId,
      employee_id: employee.id,
      outlet_id: input.outletId,
      start_date: input.startDate,
      end_date: input.endDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select("id, is_planned, plan_id")
    .single()

  if (error) {
    console.error("[action:createVisit]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId: visitWorkspaceId, userId },
    employee.id,
    {
      action: "create",
      entityType: "visit",
      entityId: data.id,
      summary: `Added ${data.is_planned ? "planned" : "unplanned"} visit`,
      metadata: {
        employee_id: employee.id,
        outlet_id: input.outletId,
        plan_id: data.plan_id,
        start_date: input.startDate,
        end_date: input.endDate,
      },
    }
  )

  revalidateVisitPages()

  return { success: true, data }
}

export type CheckInVisitInput = {
  visitId: string
  latitude: number
  longitude: number
  photoPath: string
  notes?: string
}

function gpsError(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "A GPS location is required."
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return "The GPS location is invalid."
  }
  return null
}

export async function checkInVisit(
  input: CheckInVisitInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.visitId) return failure("Visit id is required.")
  if (!input.photoPath) {
    return failure("A check-in photo is required.")
  }
  const locationError = gpsError(input.latitude, input.longitude)
  if (locationError) return failure(locationError)

  const authorized = await getAuthorizedContext(PERMISSIONS.VISITS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, employee, permissions } = authorized.context
  if (!photoBelongsToVisit(input.photoPath, companyId, input.visitId)) {
    return failure("The check-in photo does not belong to this visit.")
  }

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id, company_id, employee_id, outlet_id, check_in_at, start_date, status")
    .eq("id", input.visitId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (visitError) return failure(visitError.message)
  if (!visit) return failure("Visit not found in this company.")
  if (visit.check_in_at) return failure("This visit has already been checked in.")
  if (visit.status === "cancelled") return failure("This visit was cancelled.")

  const isSelf = employee?.id === visit.employee_id
  if (!isSelf && !hasPermission(permissions, PERMISSIONS.VISITS_UPDATE)) {
    return failure("You do not have permission to check in this visit.")
  }

  const { data: outlet } = await supabase
    .from("outlets")
    .select("id, latitude, longitude")
    .eq("id", visit.outlet_id)
    .eq("company_id", companyId)
    .maybeSingle()

  let distance: number | null = null
  if (
    typeof outlet?.latitude === "number" &&
    typeof outlet?.longitude === "number"
  ) {
    distance = haversineMeters(
      input.latitude,
      input.longitude,
      outlet.latitude,
      outlet.longitude
    )
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("visits")
    .update({
      check_in_at: now,
      check_in_latitude: input.latitude,
      check_in_longitude: input.longitude,
      check_in_distance_m: distance,
      check_in_photo_path: input.photoPath,
      notes: input.notes?.trim() || null,
      status: "checked_in",
      updated_at: now,
    })
    .eq("id", input.visitId)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:checkInVisit]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    {
      companyId,
      workspaceId: authorized.context.workspaceId,
      userId: authorized.context.userId,
    },
    employee?.id ?? null,
    {
      action: "check_in",
      entityType: "visit",
      entityId: input.visitId,
      summary: "Checked in to a visit",
      metadata: {
        outlet_id: visit.outlet_id,
        distance_m: distance,
        photo_path: input.photoPath,
      },
    }
  )

  revalidateVisitPages()

  return { success: true, data: { id: input.visitId } }
}

export type CheckOutVisitInput = {
  visitId: string
  latitude: number
  longitude: number
  photoPath: string
  notes?: string
}

export async function checkOutVisit(
  input: CheckOutVisitInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.visitId) return failure("Visit id is required.")
  if (!input.photoPath) {
    return failure("A check-out photo is required.")
  }
  const locationError = gpsError(input.latitude, input.longitude)
  if (locationError) return failure(locationError)

  const context = await getActionContext()
  if (!context.userId) return failure("You must be signed in.")
  if (!context.companyId) return failure("No company is associated with your account.")

  if (!photoBelongsToVisit(input.photoPath, context.companyId, input.visitId)) {
    return failure("The check-out photo does not belong to this visit.")
  }

  const { data: visit, error: visitError } = await context.supabase
    .from("visits")
    .select("id, company_id, employee_id, check_in_at, check_out_at, outlet_id, status")
    .eq("id", input.visitId)
    .eq("company_id", context.companyId)
    .maybeSingle()

  if (visitError) return failure(visitError.message)
  if (!visit) return failure("Visit not found in this company.")
  if (visit.check_out_at) return failure("This visit has already been checked out.")
  if (visit.status === "cancelled") return failure("This visit was cancelled.")
  if (!visit.check_in_at) return failure("Check in to the visit before checking out.")

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
      check_out_latitude: input.latitude,
      check_out_longitude: input.longitude,
      check_out_photo_path: input.photoPath,
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
      metadata: {
        outlet_id: visit.outlet_id,
        photo_path: input.photoPath,
      },
    }
  )

  revalidateVisitPages()

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

  revalidateVisitPages()

  return { success: true, data: { id } }
}
