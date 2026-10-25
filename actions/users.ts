"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function createUser(formData: FormData) {
  const name = formData.get("name")
  const supabase = await createClient()

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" }
  }

  await supabase.from("users").insert([{ title: "a" }])

  revalidatePath("/users")

  return { success: true }
}
