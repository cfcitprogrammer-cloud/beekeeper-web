"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateWorkspaceLocationInput = {
  name: string
  workspaceId: string
  latitude: number
  longitude: number
  radiusM: number
}

export type UpdateWorkspaceLocationInput = CreateWorkspaceLocationInput & { id: string }

export async function createWorkspaceLocation(
  input: CreateWorkspaceLocationInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.name.trim()) return failure("Name is required.")
  if (!input.workspaceId) return failure("Workspace is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ATTENDANCE_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("workspace_locations")
    .insert({
      company_id: companyId,
      workspace_id: input.workspaceId,
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      radius_m: input.radiusM,
      is_active: true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createWorkspaceLocation]", error)
    return failure(error.message)
  }

  revalidatePath("/attendance/locations")
  return { success: true, data }
}

export async function updateWorkspaceLocation(
  input: UpdateWorkspaceLocationInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Location id is required.")
  if (!input.name.trim()) return failure("Name is required.")
  if (!input.workspaceId) return failure("Workspace is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ATTENDANCE_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("workspace_locations")
    .update({
      workspace_id: input.workspaceId,
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      radius_m: input.radiusM,
      is_active: true,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateWorkspaceLocation]", error)
    return failure(error.message)
  }

  revalidatePath("/attendance/locations")
  return { success: true, data }
}

export async function deleteWorkspaceLocation(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Location id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ATTENDANCE_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { error } = await supabase
    .from("workspace_locations")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteWorkspaceLocation]", error)
    return failure(error.message)
  }

  revalidatePath("/attendance/locations")
  return { success: true, data: { id } }
}