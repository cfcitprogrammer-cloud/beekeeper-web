"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getActionContext,
  type ActionResult,
} from "@/actions/helpers/context"
import {
  WorkspaceFormValues,
  workspaceSchema,
} from "@/db/schema/workspace.schema"
import { getAccessContext } from "@/lib/auth/access"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { createClient } from "@/utils/supabase/server"

function isSuperAdminRole(role: string | null | undefined) {
  return role === "Super Admin"
}

export async function createWorkspace(
  values: WorkspaceFormValues
): Promise<ActionResult<{ id: string }>> {
  const parsed = workspaceSchema.safeParse(values)
  if (!parsed.success) {
    return failure("Invalid workspace details.")
  }

  const context = await getActionContext()
  if (!context.userId || !context.companyId) {
    return failure("You must be signed in with a company to create a workspace.")
  }
  if (!isSuperAdminRole(context.roleName)) {
    return failure("Only Super Admin users can create workspaces.")
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      company_id: context.companyId,
      name: parsed.data.name,
      code: parsed.data.code,
      address: parsed.data.address,
      is_active: true,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createWorkspace]", error)
    return failure(error.message)
  }

  revalidatePath("/workspaces")
  revalidatePath("/d/configuration/workspaces/all")
  return { success: true, data: { id: String(data.id) } }
}

export async function fetchWorkspaces(params: {
  pageIndex?: number
  pageSize?: number
  globalFilter?: string
  sorting?: { id: string; desc: boolean }[]
  columnFilters?: { id: string; value: unknown }[]
}) {
  const context = await getActionContext()
  if (!context.companyId) {
    throw new Error("No company is associated with your account.")
  }
  if (!isSuperAdminRole(context.roleName)) {
    throw new Error("Only Super Admin users can manage workspaces.")
  }

  const supabase = await createClient()
  const {
    pageIndex = 0,
    pageSize = 10,
    globalFilter,
    sorting = [],
    columnFilters = [],
  } = params

  const from = pageIndex * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("workspaces")
    .select("*", { count: "exact" })
    .eq("company_id", context.companyId)

  if (globalFilter) {
    query = query.or(
      `name.ilike.%${globalFilter}%,code.ilike.%${globalFilter}%`
    )
  }

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

  if (sorting.length > 0) {
    sorting.forEach((sort) => {
      query = query.order(sort.id, { ascending: !sort.desc })
    })
  } else {
    query = query.order("name", { ascending: true })
  }

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

export async function updateWorkspace(
  id: string,
  values: Partial<WorkspaceFormValues> & { isActive?: boolean }
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Workspace id is required.")

  const context = await getActionContext()
  if (!context.userId || !context.companyId) {
    return failure("You must be signed in with a company to update a workspace.")
  }
  if (!isSuperAdminRole(context.roleName)) {
    return failure("Only Super Admin users can update workspaces.")
  }

  const supabase = await createClient()
  const update: Record<string, unknown> = {}
  if (values.name !== undefined) update.name = values.name
  if (values.code !== undefined) update.code = values.code
  if (values.address !== undefined) update.address = values.address
  if (values.isActive !== undefined) update.is_active = values.isActive
  update.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from("workspaces")
    .update(update)
    .eq("id", id)
    .eq("company_id", context.companyId)

  if (error) {
    console.error("[action:updateWorkspace]", error)
    return failure(error.message)
  }

  revalidatePath("/workspaces")
  revalidatePath("/d/configuration/workspaces/all")
  return { success: true, data: { id } }
}

export async function deleteWorkspace(id: string): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Workspace id is required.")

  const context = await getActionContext()
  if (!context.userId || !context.companyId) {
    return failure("You must be signed in with a company to delete a workspace.")
  }
  if (!isSuperAdminRole(context.roleName)) {
    return failure("Only Super Admin users can delete workspaces.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("workspaces")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", context.companyId)

  if (error) {
    console.error("[action:deleteWorkspace]", error)
    return failure(error.message)
  }

  revalidatePath("/workspaces")
  revalidatePath("/d/configuration/workspaces/all")
  return { success: true, data: { id } }
}
