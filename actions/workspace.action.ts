"use server"

import {
  WorkspaceFormValues,
  workspaceSchema,
} from "@/db/schema/workspace.schema"
import { createClient } from "@/utils/supabase/server"

export async function createWorkspace(values: WorkspaceFormValues) {
  const supabase = await createClient()

  const parsed = workspaceSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors,
    }
  }

  // 1. Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log("HEREEEEEEE")
  console.log(authError)
  console.log(user)

  if (authError || !user) {
    return {
      success: false,
      message: "You must be logged in to create a workspace.",
    }
  }

  // 2. Find the employee record linked to the logged-in user
  const { data: employee, error: employeeError } = await supabase
    .from("employees_pid")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .is("deleted_on", null)
    .single()

  if (employeeError || !employee) {
    return {
      success: false,
      message: "No active employee record was found for your account.",
    }
  }

  // 3. Create the workspace under the employee's company
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description,
      code: parsed.data.code,
      company_id: employee.company_id,
    })
    .select()
    .single()

  if (workspaceError) {
    console.error("Failed to create workspace:", workspaceError)

    return {
      success: false,
      message: "Failed to create workspace.",
    }
  }

  return {
    success: true,
    data: workspace,
  }
}
