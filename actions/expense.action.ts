"use server"

import { revalidatePath } from "next/cache"

import {
  failure,
  getAuthorizedContext,
  type ActionContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { logActivity } from "@/actions/helpers/activity"
import { PERMISSIONS } from "@/lib/auth/permissions"

const PLAN_STATUSES = ["draft", "submitted", "approved", "rejected", "closed"] as const
const EXPENSE_STATUSES = ["pending", "approved", "rejected", "reimbursed", "cancelled"] as const

function planStatus(value?: string) {
  const normalized = String(value ?? "").toLowerCase()
  return (PLAN_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as (typeof PLAN_STATUSES)[number])
    : "draft"
}

function expenseStatus(value?: string) {
  const normalized = String(value ?? "").toLowerCase()
  return (EXPENSE_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as (typeof EXPENSE_STATUSES)[number])
    : "pending"
}

function dateError(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "Start and end dates are required."
  if (endDate < startDate) return "The end date cannot be before the start date."
  return null
}

async function syncPlanTotal(
  supabase: ActionContext["supabase"],
  companyId: string,
  planId: string
) {
  const { data, error } = await supabase
    .from("expenses")
    .select("amount")
    .eq("company_id", companyId)
    .eq("plan_id", planId)

  if (error) {
    console.error("[action:syncPlanTotal]", error)
    return
  }

  const total = ((data ?? []) as { amount: number | string }[]).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  )

  const { error: updateError } = await supabase
    .from("expense_plans")
    .update({ total_amount: total, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("company_id", companyId)

  if (updateError) console.error("[action:syncPlanTotal:update]", updateError)
}

export type CreateExpensePlanInput = {
  employeeId: string
  title: string
  description?: string
  startDate: string
  endDate: string
  status?: string
  currency?: string
}

export async function createExpensePlan(
  input: CreateExpensePlanInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.employeeId) return failure("Select an employee.")
  if (!input.title.trim()) return failure("A plan title is required.")
  const rangeError = dateError(input.startDate, input.endDate)
  if (rangeError) return failure(rangeError)

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context
  if (!workspaceId) return failure("No workspace is associated with your account.")

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", input.employeeId)
    .eq("company_id", companyId)
    .maybeSingle()
  if (employeeError) return failure(employeeError.message)
  if (!employee) return failure("Employee not found in this company.")

  const { data, error } = await supabase
    .from("expense_plans")
    .insert({
      company_id: companyId,
      workspace_id: workspaceId,
      employee_id: input.employeeId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
      status: planStatus(input.status),
      currency: input.currency?.trim().toUpperCase() || "PHP",
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createExpensePlan]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "create",
      entityType: "expense_plan",
      entityId: data.id,
      summary: `Created expense plan ${input.title.trim()}`,
      metadata: { employee_id: input.employeeId },
    }
  )

  revalidatePath("/expenses")
  revalidatePath("/feed")

  return { success: true, data }
}

export type UpdateExpensePlanInput = CreateExpensePlanInput & { id: string }

export async function updateExpensePlan(
  input: UpdateExpensePlanInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Expense plan id is required.")
  if (!input.title.trim()) return failure("A plan title is required.")
  const rangeError = dateError(input.startDate, input.endDate)
  if (rangeError) return failure(rangeError)

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data, error } = await supabase
    .from("expense_plans")
    .update({
      employee_id: input.employeeId || undefined,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
      status: planStatus(input.status),
      currency: input.currency?.trim().toUpperCase() || "PHP",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)
    .select("id")
    .single()

  if (error) {
    console.error("[action:updateExpensePlan]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "expense_plan",
      entityId: data.id,
      summary: `Updated expense plan ${input.title.trim()}`,
    }
  )

  revalidatePath("/expenses")
  revalidatePath("/feed")

  return { success: true, data }
}

export async function deleteExpensePlan(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Expense plan id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { error } = await supabase
    .from("expense_plans")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteExpensePlan]", error)
    return failure(error.message)
  }

  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "delete",
      entityType: "expense_plan",
      entityId: id,
      summary: "Deleted an expense plan",
    }
  )

  revalidatePath("/expenses")
  revalidatePath("/feed")

  return { success: true, data: { id } }
}

export type CreateExpenseInput = {
  planId: string
  expenseDate: string
  category?: string
  description: string
  amount: number
  currency?: string
  receiptPath?: string
  status?: string
  notes?: string
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.planId) return failure("Select an expense plan.")
  if (!input.description.trim()) return failure("An expense description is required.")
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return failure("Enter a valid expense amount.")
  }
  if (!input.expenseDate) return failure("Select the expense date.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId } = authorized.context

  const { data: plan, error: planError } = await supabase
    .from("expense_plans")
    .select("id, employee_id, workspace_id, start_date, end_date")
    .eq("id", input.planId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (planError) return failure(planError.message)
  if (!plan) return failure("Expense plan not found in this company.")
  if (input.expenseDate < plan.start_date || input.expenseDate > plan.end_date) {
    return failure("The expense date must fall inside the plan date range.")
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      company_id: companyId,
      workspace_id: plan.workspace_id,
      plan_id: plan.id,
      employee_id: plan.employee_id,
      expense_date: input.expenseDate,
      category: input.category?.trim() || "other",
      description: input.description.trim(),
      amount: input.amount,
      currency: input.currency?.trim().toUpperCase() || "PHP",
      receipt_path: input.receiptPath?.trim() || null,
      status: expenseStatus(input.status),
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createExpense]", error)
    return failure(error.message)
  }

  await syncPlanTotal(supabase, companyId, plan.id)
  await logActivity(
    supabase,
    { companyId, workspaceId, userId },
    authorized.context.employee?.id ?? null,
    {
      action: "create",
      entityType: "expense",
      entityId: data.id,
      summary: `Added expense ${input.description.trim()}`,
      metadata: { plan_id: plan.id, amount: input.amount },
    }
  )

  revalidatePath("/expenses")
  revalidatePath("/feed")

  return { success: true, data }
}

export type UpdateExpenseInput = CreateExpenseInput & { id: string }

export async function updateExpense(
  input: UpdateExpenseInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.id) return failure("Expense id is required.")
  if (!input.description.trim()) return failure("An expense description is required.")
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return failure("Enter a valid expense amount.")
  }

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_UPDATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("id, plan_id")
    .eq("id", input.id)
    .eq("company_id", companyId)
    .maybeSingle()
  if (existingError) return failure(existingError.message)
  if (!existing) return failure("Expense not found in this company.")

  const { error } = await supabase
    .from("expenses")
    .update({
      expense_date: input.expenseDate || undefined,
      category: input.category?.trim() || "other",
      description: input.description.trim(),
      amount: input.amount,
      currency: input.currency?.trim().toUpperCase() || "PHP",
      receipt_path: input.receiptPath?.trim() || null,
      status: expenseStatus(input.status),
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:updateExpense]", error)
    return failure(error.message)
  }

  await syncPlanTotal(supabase, companyId, existing.plan_id)
  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "update",
      entityType: "expense",
      entityId: input.id,
      summary: `Updated expense ${input.description.trim()}`,
    }
  )

  revalidatePath("/expenses")
  revalidatePath("/feed")

  return { success: true, data: { id: input.id } }
}

export async function deleteExpense(
  id: string
): Promise<ActionResult<{ id: string }>> {
  if (!id) return failure("Expense id is required.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_DELETE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId } = authorized.context

  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("id, plan_id")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle()
  if (existingError) return failure(existingError.message)
  if (!existing) return failure("Expense not found in this company.")

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)

  if (error) {
    console.error("[action:deleteExpense]", error)
    return failure(error.message)
  }

  await syncPlanTotal(supabase, companyId, existing.plan_id)
  await logActivity(
    supabase,
    { companyId, workspaceId, userId: authorized.context.userId },
    authorized.context.employee?.id ?? null,
    {
      action: "delete",
      entityType: "expense",
      entityId: id,
      summary: "Deleted an expense",
    }
  )

  revalidatePath("/expenses")
  revalidatePath("/feed")

  return { success: true, data: { id } }
}
