"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type CreateEmployeeInput = {
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  email?: string
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

  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)

  const employeeNo = `EMP-${String((count ?? 0) + 1).padStart(4, "0")}`

  const { data, error } = await supabase
    .from("employees")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      employee_no: employeeNo,
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
    return failure(error.message)
  }

  revalidatePath("/employees")
  revalidatePath("/dashboard")

  return { success: true, data }
}
