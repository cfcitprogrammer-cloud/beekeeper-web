"use server"

import {
  WorkspaceFormValues,
  workspaceSchema,
} from "@/db/schema/workspace.schema"
import { FetchParams } from "@/types/data-table"
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

export async function fetchWorkspaces(params: FetchParams) {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  // 2. Get the user's company_id from employees_pid
  const { data: employee, error: employeeError } = await supabase
    .from("employees_pid")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .is("deleted_on", null)
    .single()

  if (employeeError || !employee) {
    throw new Error("Employee profile or company not found.")
  }

  const {
    pageIndex = 0,
    pageSize = 10,
    globalFilter,
    sorting = [],
    columnFilters = [],
  } = params

  const from = pageIndex * pageSize
  const to = from + pageSize - 1

  // 3. Build query for workspaces
  let query = supabase
    .from("workspaces")
    .select("*", { count: "exact" })
    .eq("company_id", employee.company_id)
    .is("deleted_on", null)

  // Global Search (e.g., matching name or code)
  if (globalFilter) {
    query = query.or(
      `name.ilike.%${globalFilter}%,code.ilike.%${globalFilter}%`
    )
  }

  // Column Filters
  columnFilters.forEach((filter) => {
    const { id, value } = filter
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "string") {
        query = query.ilike(id, `%${value}%`)
      } else {
        query = query.eq(id, value)
      }
    }
  })

  // Sorting
  if (sorting.length > 0) {
    sorting.forEach((sort) => {
      query = query.order(sort.id, { ascending: !sort.desc })
    })
  } else {
    query = query.order("name", { ascending: true })
  }

  // Pagination Range
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return {
    data: data || [],
    rowCount: count || 0,
  }
}
