"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = formData.get("email")
  const password = formData.get("password")

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    redirect("/login?error=invalid-credentials")
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) {
    console.log(error)
    redirect("/a/login?error=invalid-credentials")
  }

  redirect("/d/test")
}
