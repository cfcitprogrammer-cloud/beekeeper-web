"use server"

import {
  failure,
  getActionContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions"

const PHOTO_KINDS = ["check_in", "check_out"] as const
type PhotoKind = (typeof PHOTO_KINDS)[number]

function isPhotoKind(value: string): value is PhotoKind {
  return (PHOTO_KINDS as readonly string[]).includes(value)
}

/**
 * Upload a required check-in or check-out capture to the private visit-photos
 * bucket. The returned path is stored on the visit by the check-in/out action.
 */
export async function uploadVisitPhoto(
  formData: FormData
): Promise<ActionResult<{ path: string }>> {
  const visitId = String(formData.get("visitId") ?? "")
  const kindValue = String(formData.get("kind") ?? "")
  const file = formData.get("file")

  if (!visitId) return failure("Visit id is required.")
  if (!isPhotoKind(kindValue)) return failure("Invalid photo type.")
  if (!(file instanceof File) || file.size === 0) {
    return failure(`A ${kindValue === "check_in" ? "check-in" : "check-out"} photo is required.`)
  }
  if (!file.type.startsWith("image/")) {
    return failure("The captured photo must be an image.")
  }

  const context = await getActionContext()
  if (!context.userId) return failure("You must be signed in.")
  if (!context.companyId) return failure("No company is associated with your account.")
  if (
    !hasPermission(context.permissions, PERMISSIONS.VISITS_CREATE) &&
    !hasPermission(context.permissions, PERMISSIONS.VISITS_UPDATE)
  ) {
    return failure("You do not have permission to upload visit photos.")
  }

  const { supabase, companyId, employee, permissions } = context

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id, employee_id")
    .eq("id", visitId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (visitError) return failure(visitError.message)
  if (!visit) return failure("Visit not found in this company.")

  const isSelf = employee?.id === visit.employee_id
  if (!isSelf && !hasPermission(permissions, PERMISSIONS.VISITS_UPDATE)) {
    return failure("You do not have permission to upload a photo for this visit.")
  }

  const extension = file.type === "image/png" ? "png" : "jpg"
  const path = `${companyId}/${visitId}/${kindValue}-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from("visit-photos")
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadError) {
    console.error("[action:uploadVisitPhoto]", uploadError)
    return failure(uploadError.message)
  }

  return { success: true, data: { path } }
}
