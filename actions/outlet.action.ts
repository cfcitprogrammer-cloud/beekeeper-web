"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateOutletInput = {
  name: string
  code: string
  address?: string
  contactPerson?: string
  phone?: string
  email?: string
  latitude?: number
  longitude?: number
  geofenceRadiusM?: number
}

export type UpdateOutletInput = CreateOutletInput & { id: string }

export async function updateOutlet(
  input: UpdateOutletInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Outlet id is required.")
  if (!input.name.trim() || !input.code.trim()) {
    return failure("Outlet name and code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("outlets")
    .update({
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      address: input.address?.trim() || null,
      contact_person: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      latitude: input.latitude ?? 14.5995,
      longitude: input.longitude ?? 120.9842,
      geofence_radius_m: input.geofenceRadiusM ?? 150,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateOutlet]", error)
    return failure(error.message)
  }

  revalidatePath("/outlets")
  revalidatePath("/dashboard")
  return { success: true, data }
}

export async function deleteOutlet(id: string): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Outlet id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("outlets")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteOutlet]", error)
    return failure(error.message)
  }

  revalidatePath("/outlets")
  revalidatePath("/dashboard")
  return { success: true, data: { id } }
}
export async function createOutlet(
  input: CreateOutletInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim() || !input.code.trim()) {
    return failure("Outlet name and code are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.OUTLETS_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  if (!workspaceId) {
    return failure(
      "No workspace is associated with your account. Ask an administrator to assign one."
    )
  }

  const { data, error } = await supabase
    .from("outlets")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      address: input.address?.trim() || null,
      contact_person: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      latitude: input.latitude ?? 14.5995,
      longitude: input.longitude ?? 120.9842,
      geofence_radius_m: input.geofenceRadiusM ?? 150,
      is_active: false,
      status: "pending_approval",
      submitted_at: new Date().toISOString(),
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createOutlet]", error)
    return failure(error.message)
  }

  revalidatePath("/outlets")
  revalidatePath("/approvals/inbox")
  revalidatePath("/dashboard")

  return { success: true, data }
}
