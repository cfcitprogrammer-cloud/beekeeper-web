"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { logActivity } from "@/actions/helpers/activity"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateOutletInput = {
  name: string
  code: string
  description?: string
  address?: string
  region?: string
  province?: string
  city?: string
  barangay?: string
  zipCode?: string
  contactPerson?: string
  phone?: string
  email?: string
  latitude?: number
  longitude?: number
  geofenceRadiusM?: number
  isActive?: boolean
  isDistributor?: boolean
  distributorId?: string | null
}

export type UpdateOutletInput = CreateOutletInput & { id: string }

function validateCoordinates(latitude?: number, longitude?: number) {
  if (latitude === undefined || longitude === undefined) return null
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return "Latitude must be between -90 and 90."
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return "Longitude must be between -180 and 180."
  }
  return null
}

export async function updateOutlet(
  input: UpdateOutletInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Outlet id is required.")
  if (!input.name.trim() || !input.code.trim()) {
    return failure("Outlet name and code are required.")
  }
  const coordinateError = validateCoordinates(input.latitude, input.longitude)
  if (coordinateError) return failure(coordinateError)

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("outlets")
    .update({
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() || null,
      address: input.address?.trim() || null,
      region: input.region?.trim() || null,
      province: input.province?.trim() || null,
      city: input.city?.trim() || null,
      barangay: input.barangay?.trim() || null,
      zip_code: input.zipCode?.trim() || null,
      contact_person: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      latitude: input.latitude ?? 14.5995,
      longitude: input.longitude ?? 120.9842,
      geofence_radius_m: input.geofenceRadiusM ?? 150,
      ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
      is_distributor: input.isDistributor ?? false,
      distributor_id: input.isDistributor
        ? null
        : (input.distributorId ?? null),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateOutlet]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "outlet",
      entityId: input.id,
      summary: `Updated outlet ${input.name.trim()}`,
    }
  )

  revalidatePath("/outlets")
  revalidatePath("/outlets/assignments")
  revalidatePath("/dashboard")
  revalidatePath("/feed")
  return { success: true, data }
}

export async function deleteOutlet(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Outlet id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  await supabase
    .from("approval_requests")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("document_type", "outlet")
    .eq("document_id", id)
    .eq("status", "pending")

  const { error } = await supabase
    .from("outlets")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteOutlet]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "delete",
      entityType: "outlet",
      entityId: id,
      summary: "Deleted an outlet",
    }
  )

  revalidatePath("/outlets")
  revalidatePath("/outlets/assignments")
  revalidatePath("/dashboard")
  revalidatePath("/feed")
  return { success: true, data: { id } }
}
export async function createOutlet(
  input: CreateOutletInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim() || !input.code.trim()) {
    return failure("Outlet name and code are required.")
  }
  const coordinateError = validateCoordinates(input.latitude, input.longitude)
  if (coordinateError) return failure(coordinateError)

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  if (!workspaceId) {
    return failure(
      "No workspace is associated with your account. Ask an administrator to assign one."
    )
  }

  console.log("AAAAAAAAAAAAAAAAAAAAAAAAA")
  console.log(input)

  const { data, error } = await supabase
    .from("outlets")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      description: input.description?.trim() || null,
      address: input.address?.trim() || null,
      region: input.region?.trim() || null,
      province: input.province?.trim() || null,
      city: input.city?.trim() || null,
      barangay: input.barangay?.trim() || null,
      zip_code: input.zipCode?.trim() || null,
      contact_person: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      latitude: input.latitude ?? 14.5995,
      longitude: input.longitude ?? 120.9842,
      geofence_radius_m: input.geofenceRadiusM ?? 150,
      is_active: input.isActive ?? false,
      is_distributor: input.isDistributor ?? false,
      distributor_id: input.isDistributor
        ? null
        : (input.distributorId ?? null),
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createOutlet]", error)
    return failure(error.message)
  }

  // Create the approval request (and inbox stages) for the new outlet.
  const { error: submitError } = await supabase.rpc("submit_for_approval", {
    p_document_type: "outlet",
    p_document_id: data.id,
  })

  if (submitError) {
    console.error("[action:createOutlet:submit]", submitError)
    // Roll back the freshly inserted draft so a retry does not collide with
    // the unique (company_id, code) constraint.
    await supabase.from("outlets").delete().eq("id", data.id)
    return failure(submitError.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "create",
      entityType: "outlet",
      entityId: data.id,
      summary: `Submitted outlet ${input.name.trim()} for onboarding`,
      metadata: {
        latitude: input.latitude ?? 14.5995,
        longitude: input.longitude ?? 120.9842,
      },
    }
  )

  revalidatePath("/outlets")
  revalidatePath("/outlets/assignments")
  revalidatePath("/approvals/inbox")
  revalidatePath("/dashboard")
  revalidatePath("/feed")

  return { success: true, data }
}
