"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { defaultRouteFor } from "@/lib/auth/permissions"
import { createClient } from "@/utils/supabase/server"

export type LoginState = {
  error?: string
  email?: string
}

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
})

export async function login(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Enter your email and password.",
      email: String(formData.get("email") ?? ""),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return {
      error:
        error.message === "Email not confirmed"
          ? "Confirm your email address before signing in."
          : "Invalid email or password. Please try again.",
      email: parsed.data.email,
    }
  }

  const next = formData.get("next")
  const requested =
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    next !== ""
      ? next
      : null

  let fallback = "/home"
  if (!requested) {
    fallback = defaultRouteFor()
  }

  redirect(requested ?? fallback)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
