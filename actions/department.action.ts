"use server"

import {
  DepartmentFormValues,
  departmentSchema,
} from "@/db/schema/department.schema"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function createDepartment(values: DepartmentFormValues) {
  const supabase = await createClient()
  const parsed = departmentSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    }
  }

  const { data, error } = await supabase
    .from("departments")
    .insert([parsed.data])

  revalidatePath("/users")

  return { success: true }
}
