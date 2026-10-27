// actions/salesGroup.action.ts
"use server"

import {
  SalesGroupFormValues,
  salesGroupSchema,
} from "@/db/schema/sales_group.schema"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getUserWorkspaceId } from "./helpers/workspace"

export async function createSalesGroup(values: SalesGroupFormValues) {
  const parsed = salesGroupSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: "Invalid form data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const supabase = await createClient()

    // Call the helper directly
    const workspace_id = await getUserWorkspaceId()

    const { error } = await supabase.from("sales_groups").insert([
      {
        ...parsed.data,
        workspace_id,
      },
    ])

    if (error) {
      console.error("Supabase Insert Error:", error)
      return {
        success: false,
        error: true,
        message: error.message,
      }
    }

    revalidatePath("/d/configuration/sales-groups/all")

    return { success: true }
  } catch (error: any) {
    console.error("Action Error:", error)
    return {
      success: false,
      error: true,
      message: error.message || "An unexpected error occurred",
    }
  }
}
