"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { logActivity } from "@/actions/helpers/activity"
import { PERMISSIONS } from "@/lib/auth/permissions"
import { createAdminClient } from "@/utils/supabase/admin"

export type CreateEmployeeInput = {
  employeeNo?: string
  sssNo?: string
  philhealthNo?: string
  tinNo?: string
  pagibigNo?: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  email?: string
  password?: string
  createAccount?: boolean
  phone?: string
  birthDate?: string
  gender?: string
  civilStatus?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  departmentId?: string
  positionId?: string
  managerId?: string
  employmentType: string
  status: string
  hireDate: string
  baseSalary?: number
  payFrequency?: string
}

function dbEmploymentType(value: string) {
  switch (value.toUpperCase()) {
    case "PART_TIME":
      return "part_time"
    case "CONTRACTOR":
      return "contractual"
    case "INTERN":
      return "intern"
    case "CONSULTANT":
      return "consultant"
    default:
      return "full_time"
  }
}

function dbEmploymentStatus(value: string) {
  return value.toLowerCase()
}

function dbPayFrequency(value?: string) {
  if (!value) return null
  return value.toLowerCase()
}

function dbGender(value?: string) {
  if (!value) return null
  return value.toLowerCase()
}

function statutoryId(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

export type UpdateEmployeeInput = CreateEmployeeInput & { id: string }

export async function updateEmployee(
  input: UpdateEmployeeInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Employee id is required.")
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return failure("First name and last name are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("employees")
    .update({
      ...(input.employeeNo?.trim() ? { employee_no: input.employeeNo.trim() } : {}),
      sss_no: statutoryId(input.sssNo),
      philhealth_no: statutoryId(input.philhealthNo),
      tin_no: statutoryId(input.tinNo),
      pagibig_no: statutoryId(input.pagibigNo),
      first_name: input.firstName.trim(),
      middle_name: input.middleName?.trim() || null,
      last_name: input.lastName.trim(),
      suffix: input.suffix?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      birth_date: input.birthDate || null,
      gender: dbGender(input.gender),
      civil_status: input.civilStatus || null,
      address: input.address?.trim() || null,
      emergency_contact_name: input.emergencyContactName?.trim() || null,
      emergency_contact_phone: input.emergencyContactPhone?.trim() || null,
      department_id: input.departmentId || null,
      position_id: input.positionId || null,
      manager_id: input.managerId || null,
      employment_type: dbEmploymentType(input.employmentType),
      status: dbEmploymentStatus(input.status),
      hire_date: input.hireDate || null,
      base_salary: input.baseSalary ?? null,
      pay_frequency: dbPayFrequency(input.payFrequency),
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateEmployee]", error)
    return failure(error.message)
  }

  await logActivity(supabase, { companyId, workspaceId, userId: authorized.context.userId }, authorized.context.employee?.id ?? null, {
    action: "update",
    entityType: "employee",
    entityId: input.id,
    summary: `Updated employee ${input.firstName.trim()} ${input.lastName.trim()}`,
  })

  revalidatePath("/employees")
  revalidatePath(`/employees/${input.id}`)
  revalidatePath("/dashboard")
  revalidatePath("/feed")
  return { success: true, data }
}

export async function deleteEmployee(id: string): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Employee id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteEmployee]", error)
    return failure(error.message)
  }

  await logActivity(supabase, { companyId, workspaceId, userId: authorized.context.userId }, authorized.context.employee?.id ?? null, {
    action: "delete",
    entityType: "employee",
    entityId: id,
    summary: "Deleted an employee record",
  })

  revalidatePath("/employees")
  revalidatePath("/dashboard")
  revalidatePath("/feed")
  return { success: true, data: { id } }
}

export async function createEmployee(
  input: CreateEmployeeInput
): Promise<ActionResult<{ id: string; employee_no: string }>> {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return failure("First name and last name are required.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.EMPLOYEES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  if (!workspaceId) {
    return failure(
      "No workspace is associated with your account. Ask an administrator to assign one."
    )
  }

  if (input.createAccount) {
    if (!input.email?.trim()) {
      return failure("A work email is required to create a login account.")
    }
    if (!input.password || input.password.length < 8) {
      return failure("The login password must be at least 8 characters.")
    }
  }

  // Optionally create a Supabase auth account for the employee.
  let userId: string | null = null
  let adminClient: ReturnType<typeof createAdminClient> = null
  if (input.createAccount && input.email?.trim() && input.password) {
    adminClient = createAdminClient()
    if (adminClient) {
      const { data: created, error: createError } =
        await adminClient.auth.admin.createUser({
          email: input.email.trim(),
          password: input.password,
          email_confirm: true,
          user_metadata: {
            full_name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
          },
        })
      if (createError || !created.user) {
        console.error("[action:createEmployee:admin]", createError)
        return failure(createError?.message ?? "Could not create login account.")
      }
      userId = created.user.id
    } else {
      // Fallback to anon signUp (requires email confirmation).
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            full_name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
          },
        },
      })
      if (signUpError || !signUpData.user) {
        console.error("[action:createEmployee:signUp]", signUpError)
        return failure(signUpError?.message ?? "Could not create login account.")
      }
      userId = signUpData.user.id
    }
  }

  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)

  const employeeNo =
    input.employeeNo?.trim() || `EMP-${String((count ?? 0) + 1).padStart(4, "0")}`

  const { data, error } = await supabase
    .from("employees")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      user_id: userId,
      employee_no: employeeNo,
      sss_no: statutoryId(input.sssNo),
      philhealth_no: statutoryId(input.philhealthNo),
      tin_no: statutoryId(input.tinNo),
      pagibig_no: statutoryId(input.pagibigNo),
      first_name: input.firstName.trim(),
      middle_name: input.middleName?.trim() || null,
      last_name: input.lastName.trim(),
      suffix: input.suffix?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      birth_date: input.birthDate || null,
      gender: dbGender(input.gender),
      civil_status: input.civilStatus || null,
      address: input.address?.trim() || null,
      emergency_contact_name: input.emergencyContactName?.trim() || null,
      emergency_contact_phone: input.emergencyContactPhone?.trim() || null,
      department_id: input.departmentId || null,
      position_id: input.positionId || null,
      manager_id: input.managerId || null,
      employment_type: dbEmploymentType(input.employmentType),
      status: dbEmploymentStatus(input.status),
      hire_date: input.hireDate || null,
      base_salary: input.baseSalary ?? null,
      pay_frequency: dbPayFrequency(input.payFrequency),
    })
    .select("id, employee_no")
    .single()

  if (error) {
    console.error("[action:createEmployee]", error)
    if (userId && adminClient) {
      await adminClient.auth.admin.deleteUser(userId)
    }
    return failure(error.message)
  }

  await logActivity(supabase, { companyId, workspaceId, userId: authorized.context.userId }, authorized.context.employee?.id ?? null, {
    action: "create",
    entityType: "employee",
    entityId: data.id,
    summary: `Onboarded ${input.firstName.trim()} ${input.lastName.trim()} (${data.employee_no})`,
    metadata: { employee_no: data.employee_no, login_created: Boolean(userId) },
  })

  revalidatePath("/employees")
  revalidatePath("/dashboard")
  revalidatePath("/feed")

  return { success: true, data }
}
