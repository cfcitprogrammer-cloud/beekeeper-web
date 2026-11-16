"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { isPermissionKey, PERMISSIONS } from "@/lib/auth/permissions"

export type CreateRoleInput = {
  name: string
  description?: string
}

export type UpdateRoleInput = CreateRoleInput & { id: string }

type SupabaseClient = ActionContext["supabase"]

async function getCompanyRole(
  supabase: SupabaseClient,
  companyId: string,
  roleId: string
) {
  return supabase
    .from("roles")
    .select("id, is_system, role_permissions(permission_key)")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle()
}

export async function createRole(
  input: CreateRoleInput
): Promise<ActionResult<{ id: string }>> {
  const name = input.name.trim()
  if (!name) return failure("Role name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ROLES_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context

  const { data, error } = await supabase
    .from("roles")
    .insert({
      company_id: companyId,
      name,
      description: input.description?.trim() || null,
      is_system: false,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createRole]", error)
    if (error.code === "23505") {
      return failure("A role with that name already exists.")
    }
    return failure(error.message)
  }

  revalidatePath("/roles")
  return { success: true, data }
}

export async function updateRole(
  input: UpdateRoleInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Role id is required.")
  const name = input.name.trim()
  if (!name) return failure("Role name is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ROLES_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context
  const { data: role, error: roleError } = await getCompanyRole(
    supabase,
    companyId,
    input.id
  )

  if (roleError) {
    console.error("[action:updateRole:lookup]", roleError)
    return failure(roleError.message)
  }
  if (!role) return failure("Role not found.")
  if (role.is_system) return failure("System roles cannot be renamed or edited.")

  const { data, error } = await supabase
    .from("roles")
    .update({
      name,
      description: input.description?.trim() || null,
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateRole]", error)
    if (error.code === "23505") {
      return failure("A role with that name already exists.")
    }
    return failure(error.message)
  }

  revalidatePath("/roles")
  return { success: true, data }
}

export async function setRolePermissions(input: {
  roleId: string
  permissionKeys: string[]
}): Promise<ActionResult<{ roleId: string }>> {
  if (!input.roleId) return failure("Role id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ROLES_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, roleId: currentRoleId } = authorized.context
  const { data: role, error: roleError } = await getCompanyRole(
    supabase,
    companyId,
    input.roleId
  )

  if (roleError) {
    console.error("[action:setRolePermissions:lookup]", roleError)
    return failure(roleError.message)
  }
  if (!role) return failure("Role not found.")
  if (role.is_system) {
    return failure(
      "System roles always keep the full permission catalog and cannot be edited."
    )
  }

  const existing = (role.role_permissions ?? []).map(
    (permission) => permission.permission_key
  )
  const requested = new Set(
    input.permissionKeys.filter((key) => isPermissionKey(key))
  )
  // Keep permission keys that are no longer in the application catalog so a
  // deployment change does not silently strip grants.
  existing
    .filter((key) => !isPermissionKey(key))
    .forEach((key) => requested.add(key))

  if (
    role.id === currentRoleId &&
    !requested.has(PERMISSIONS.ROLES_MANAGE)
  ) {
    return failure(
      "You cannot remove the roles.manage permission from the role you are signed in with."
    )
  }

  const target = Array.from(requested)
  const toAdd = target.filter((key) => !existing.includes(key))
  const toRemove = existing.filter((key) => !target.includes(key))

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("role_permissions")
      .insert(
        toAdd.map((permissionKey) => ({
          role_id: role.id,
          permission_key: permissionKey,
        }))
      )

    if (error) {
      console.error("[action:setRolePermissions:add]", error)
      return failure(error.message)
    }
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", role.id)
      .in("permission_key", toRemove)

    if (error) {
      console.error("[action:setRolePermissions:remove]", error)
      return failure(error.message)
    }
  }

  revalidatePath("/roles")
  revalidatePath("/", "layout")
  return { success: true, data: { roleId: role.id } }
}

export async function deleteRole(
  roleId: string
): Promise<ActionResult<{ id: string }>> {
  if (!roleId) return failure("Role id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ROLES_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context
  const { data: role, error: roleError } = await getCompanyRole(
    supabase,
    companyId,
    roleId
  )

  if (roleError) {
    console.error("[action:deleteRole:lookup]", roleError)
    return failure(roleError.message)
  }
  if (!role) return failure("Role not found.")
  if (role.is_system) return failure("System roles cannot be deleted.")

  const [companyMembers, workspaceMembers] = await Promise.all([
    supabase
      .from("company_members")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("role_id", roleId),
    supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("role_id", roleId),
  ])

  if (companyMembers.error || workspaceMembers.error) {
    const error = companyMembers.error ?? workspaceMembers.error
    console.error("[action:deleteRole:usage]", error)
    return failure(error?.message ?? "Could not check role usage.")
  }

  const usage =
    (companyMembers.count ?? 0) + (workspaceMembers.count ?? 0)
  if (usage > 0) {
    return failure(
      `This role is assigned to ${usage} member${usage === 1 ? "" : "s"}. Reassign them before deleting it.`
    )
  }

  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id", roleId)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteRole]", error)
    return failure(error.message)
  }

  revalidatePath("/roles")
  return { success: true, data: { id: roleId } }
}

export async function assignCompanyRole(input: {
  userId: string
  roleId: string
}): Promise<ActionResult<{ userId: string }>> {
  if (!input.userId) return failure("User id is required.")
  if (!input.roleId) return failure("Role id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ROLES_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, userId } = authorized.context

  if (input.userId === userId) {
    return failure("You cannot change your own role from this page.")
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("id", input.roleId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (roleError) {
    console.error("[action:assignCompanyRole:role]", roleError)
    return failure(roleError.message)
  }
  if (!role) return failure("Role not found.")

  const { data: existingMember, error: membershipError } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("user_id", input.userId)
    .maybeSingle()

  if (membershipError) {
    console.error("[action:assignCompanyRole:membership]", membershipError)
    return failure(membershipError.message)
  }

  if (!existingMember) {
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", input.userId)
      .maybeSingle()

    if (employeeError) {
      console.error("[action:assignCompanyRole:employee]", employeeError)
      return failure(employeeError.message)
    }
    if (!employee) {
      return failure("That user is not part of this company.")
    }
  }

  const { error } = await supabase.from("company_members").upsert(
    {
      user_id: input.userId,
      company_id: companyId,
      role_id: input.roleId,
    },
    { onConflict: "user_id,company_id" }
  )

  if (error) {
    console.error("[action:assignCompanyRole]", error)
    return failure(error.message)
  }

  revalidatePath("/roles")
  revalidatePath("/", "layout")
  return { success: true, data: { userId: input.userId } }
}

export async function removeCompanyMember(
  targetUserId: string
): Promise<ActionResult<{ userId: string }>> {
  if (!targetUserId) return failure("User id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.ROLES_MANAGE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, userId } = authorized.context

  if (targetUserId === userId) {
    return failure("You cannot remove your own access from this page.")
  }

  const [companyResult, workspaceResult] = await Promise.all([
    supabase
      .from("company_members")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", targetUserId),
    supabase
      .from("workspace_members")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", targetUserId),
  ])

  if (companyResult.error || workspaceResult.error) {
    const error = companyResult.error ?? workspaceResult.error
    console.error("[action:removeCompanyMember]", error)
    return failure(error?.message ?? "Could not remove access.")
  }

  revalidatePath("/roles")
  revalidatePath("/", "layout")
  return { success: true, data: { userId: targetUserId } }
}
