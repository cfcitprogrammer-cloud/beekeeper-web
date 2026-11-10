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

function revalidateExpensePages() {
  revalidatePath("/expenses")
  revalidatePath("/expenses/items")
  revalidatePath("/expenses/plans")
  revalidatePath("/feed")
}

async function syncPlanTotal(
  supabase: ActionContext["supabase"],
  companyId: string,
  planId: string | null
) {
  if (!planId) return

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

async function resolveCategory(
  supabase: ActionContext["supabase"],
  companyId: string,
  categoryId?: string
): Promise<
  | { categoryId: string; name: string }
  | { categoryId: null; name: null }
  | { error: string }
> {
  if (!categoryId) return { categoryId: null, name: null }

  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name")
    .eq("id", categoryId)
    .eq("company_id", companyId)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: "Expense category not found in this company." }

  return { categoryId: data.id, name: data.name }
}

export type CreateExpensePlanInput = {
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
  if (!input.title.trim()) return failure("A plan title is required.")
  const rangeError = dateError(input.startDate, input.endDate)
  if (rangeError) return failure(rangeError)

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId, employee } =
    authorized.context
  if (!employee) {
    return failure(
      "Your account is not linked to an employee record. Ask an administrator to link it before creating expense plans."
    )
  }

  const planWorkspaceId = employee.workspace_id || workspaceId

  // Status is intentionally omitted: the database default applies on create.
  const { data, error } = await supabase
    .from("expense_plans")
    .insert({
      company_id: companyId,
      workspace_id: planWorkspaceId,
      employee_id: employee.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
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
    { companyId, workspaceId: planWorkspaceId, userId },
    employee.id,
    {
      action: "create",
      entityType: "expense_plan",
      entityId: data.id,
      summary: `Created expense plan ${input.title.trim()}`,
      metadata: { employee_id: employee.id },
    }
  )

  revalidateExpensePages()

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

  revalidateExpensePages()

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

  revalidateExpensePages()

  return { success: true, data: { id } }
}

export type CreateExpenseInput = {
  planId?: string
  expenseDate: string
  categoryId?: string
  category?: string
  description: string
  amount: number
  currency?: string
  receiptPath?: string
  isReimbursable?: boolean
  status?: string
  notes?: string
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<ActionResult<{ id: string }>> {
  if (!input.description.trim()) return failure("An expense description is required.")
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return failure("Enter a valid expense amount.")
  }
  if (!input.expenseDate) return failure("Select the expense date.")

  const authorized = await getAuthorizedContext(PERMISSIONS.EXPENSES_CREATE)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId, workspaceId, userId, employee } =
    authorized.context
  if (!employee) {
    return failure(
      "Your account is not linked to an employee record. Ask an administrator to link it before recording expenses."
    )
  }

  let planId: string | null = input.planId?.trim() || null
  let expenseWorkspaceId = employee.workspace_id || workspaceId

  if (planId) {
    const { data: plan, error: planError } = await supabase
      .from("expense_plans")
      .select("id, employee_id, workspace_id, start_date, end_date")
      .eq("id", planId)
      .eq("company_id", companyId)
      .maybeSingle()

    if (planError) return failure(planError.message)
    if (!plan) return failure("Expense plan not found in this company.")
    if (plan.employee_id !== employee.id) {
      return failure("You can only add expenses to your own expense plan.")
    }
    if (
      input.expenseDate < plan.start_date ||
      input.expenseDate > plan.end_date
    ) {
      return failure("The expense date must fall inside the plan date range.")
    }
    expenseWorkspaceId = plan.workspace_id
  } else {
    planId = null
  }

  if (!expenseWorkspaceId) {
    return failure("No workspace is associated with your account.")
  }

  const category = await resolveCategory(supabase, companyId, input.categoryId)
  if ("error" in category) return failure(category.error)

  // Status is intentionally omitted: the database default applies on create.
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      company_id: companyId,
      workspace_id: expenseWorkspaceId,
      plan_id: planId,
      employee_id: employee.id,
      expense_date: input.expenseDate,
      ...(category.name ? { category: category.name } : {}),
      category_id: category.categoryId,
      description: input.description.trim(),
      amount: input.amount,
      currency: input.currency?.trim().toUpperCase() || "PHP",
      receipt_path: input.receiptPath?.trim() || null,
      is_reimbursable: Boolean(input.isReimbursable),
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[action:createExpense]", error)
    return failure(error.message)
  }

  await syncPlanTotal(supabase, companyId, planId)
  await logActivity(
    supabase,
    { companyId, workspaceId: expenseWorkspaceId, userId },
    employee.id,
    {
      action: "create",
      entityType: "expense",
      entityId: data.id,
      summary: `Added expense ${input.description.trim()}`,
      metadata: { plan_id: planId, amount: input.amount },
    }
  )

  revalidateExpensePages()

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

  const { supabase, companyId, workspaceId, employee } = authorized.context

  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("id, plan_id, employee_id")
    .eq("id", input.id)
    .eq("company_id", companyId)
    .maybeSingle()
  if (existingError) return failure(existingError.message)
  if (!existing) return failure("Expense not found in this company.")

  let employeeId = existing.employee_id
  let planId: string | null = input.planId?.trim() || null
  let expenseWorkspaceId: string | null = null

  if (planId) {
    const { data: plan, error: planError } = await supabase
      .from("expense_plans")
      .select("id, employee_id, workspace_id, start_date, end_date")
      .eq("id", planId)
      .eq("company_id", companyId)
      .maybeSingle()

    if (planError) return failure(planError.message)
    if (!plan) return failure("Expense plan not found in this company.")
    if (planId !== existing.plan_id) {
      if (!employee) {
        return failure(
          "Your account is not linked to an employee record. Ask an administrator to link it before attaching expenses to a plan."
        )
      }
      if (plan.employee_id !== employee.id) {
        return failure("You can only attach expenses to your own expense plan.")
      }
    }
    if (
      input.expenseDate < plan.start_date ||
      input.expenseDate > plan.end_date
    ) {
      return failure("The expense date must fall inside the plan date range.")
    }
    employeeId = plan.employee_id
    expenseWorkspaceId = plan.workspace_id
  } else {
    planId = null
  }

  const category = await resolveCategory(supabase, companyId, input.categoryId)
  if ("error" in category) return failure(category.error)

  const { error } = await supabase
    .from("expenses")
    .update({
      plan_id: planId,
      employee_id: employeeId,
      ...(expenseWorkspaceId ? { workspace_id: expenseWorkspaceId } : {}),
      expense_date: input.expenseDate || undefined,
      category: category.name ?? "other",
      category_id: category.categoryId,
      description: input.description.trim(),
      amount: input.amount,
      currency: input.currency?.trim().toUpperCase() || "PHP",
      ...(input.receiptPath !== undefined
        ? { receipt_path: input.receiptPath.trim() || null }
        : {}),
      is_reimbursable: Boolean(input.isReimbursable),
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
  if (planId && planId !== existing.plan_id) {
    await syncPlanTotal(supabase, companyId, planId)
  }
  await logActivity(
    supabase,
    {
      companyId,
      workspaceId: expenseWorkspaceId ?? workspaceId,
      userId: authorized.context.userId,
    },
    employee?.id ?? existing.employee_id,
    {
      action: "update",
      entityType: "expense",
      entityId: input.id,
      summary: `Updated expense ${input.description.trim()}`,
    }
  )

  revalidateExpensePages()

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

  revalidateExpensePages()

  return { success: true, data: { id } }
}
