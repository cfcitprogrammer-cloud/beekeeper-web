"use server"

import { revalidatePath } from "next/cache"

import { failure, getActionContext, type ActionResult } from "@/actions/helpers/context"
import { createClient } from "@/utils/supabase/server"

export async function changePassword(input: {
  newPassword: string
}): Promise<ActionResult<{ success: true }>> {
  const context = await getActionContext()
  if (!context.userId) {
    return failure("You must be signed in to change your password.")
  }
  if (!input.newPassword || input.newPassword.length < 8) {
    return failure("The new password must be at least 8 characters long.")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  })

  if (error) {
    console.error("[action:changePassword]", error)
    return failure(error.message)
  }

  revalidatePath("/account")
  return { success: true, data: { success: true } }
}
