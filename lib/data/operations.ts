import { createClient } from "@/utils/supabase/server"
import type {
  Employee,
  EmployeeOutletAssignment,
  Expense,
  ExpensePlan,
  Outlet,
  ProductionPipeline,
  ProductionRun,
  ProductionStage,
  ProductionUsage,
  Visit,
  VisitPlan,
  VisitPlanOutlet,
} from "@/db/models/models"

export type QueryResult<T> = { data: T }

function empty<T>(data: T): QueryResult<T> {
  return { data }
}

function logError(scope: string, error: { message?: string } | null) {
  if (error) console.error(`[operations:${scope}]`, error.message ?? error)
}

type EmployeeSummary = Pick<
  Employee,
  "id" | "employee_no" | "first_name" | "last_name" | "email"
>
type OutletSummary = Pick<Outlet, "id" | "code" | "name" | "address">

export type AssignmentWithRelations = EmployeeOutletAssignment & {
  employee: EmployeeSummary | null
  outlet: OutletSummary | null
}

export async function getOutletAssignments(): Promise<
  QueryResult<AssignmentWithRelations[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employee_outlet_assignments")
    .select(
      "*, employee:employees(id,employee_no,first_name,last_name,email), outlet:outlets(id,code,name,address)"
    )
    .order("assigned_at", { ascending: false })

  logError("outlet-assignments", error)
  return empty((data as AssignmentWithRelations[] | null) ?? [])
}

export type ExpensePlanWithRelations = ExpensePlan & {
  employee: EmployeeSummary | null
  expenses: Expense[]
}

export async function getExpensePlans(): Promise<
  QueryResult<ExpensePlanWithRelations[]>
> {
  const supabase = await createClient()
  const [plansResult, expensesResult] = await Promise.all([
    supabase
      .from("expense_plans")
      .select("*, employee:employees(id,employee_no,first_name,last_name,email)")
      .order("start_date", { ascending: false }),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
  ])

  logError("expense-plans", plansResult.error)
  logError("expenses", expensesResult.error)
  if (plansResult.error || !plansResult.data) return empty([])

  const expenses = (expensesResult.data ?? []) as Expense[]
  return empty(
    (plansResult.data as (ExpensePlan & { employee: EmployeeSummary | null })[]).map(
      (plan) => ({
        ...plan,
        expenses: expenses.filter((expense) => expense.plan_id === plan.id),
      })
    )
  )
}

export type ProductionPipelineWithRelations = ProductionPipeline & {
  stages: ProductionStage[]
  runs: ProductionRun[]
}

export async function getProductionPipelines(): Promise<
  QueryResult<ProductionPipelineWithRelations[]>
> {
  const supabase = await createClient()
  const [pipelinesResult, stagesResult, runsResult] = await Promise.all([
    supabase.from("production_pipelines").select("*").order("name"),
    supabase.from("production_stages").select("*").order("sequence"),
    supabase.from("production_runs").select("*").order("created_at", { ascending: false }),
  ])

  logError("production-pipelines", pipelinesResult.error)
  logError("production-stages", stagesResult.error)
  logError("production-runs", runsResult.error)
  if (pipelinesResult.error || !pipelinesResult.data) return empty([])

  const stages = (stagesResult.data ?? []) as ProductionStage[]
  const runs = (runsResult.data ?? []) as ProductionRun[]

  return empty(
    (pipelinesResult.data as ProductionPipeline[]).map((pipeline) => ({
      ...pipeline,
      stages: stages
        .filter((stage) => stage.pipeline_id === pipeline.id)
        .sort((a, b) => a.sequence - b.sequence),
      runs: runs.filter((run) => run.pipeline_id === pipeline.id),
    }))
  )
}

export async function getProductionUsage(): Promise<QueryResult<ProductionUsage[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("production_usage")
    .select("*")
    .order("recorded_at", { ascending: true })

  logError("production-usage", error)
  return empty((data as ProductionUsage[] | null) ?? [])
}

export type VisitPlanWithRelations = VisitPlan & {
  employee: EmployeeSummary | null
  targets: (VisitPlanOutlet & { outlet: OutletSummary | null })[]
}

export async function getVisitPlans(): Promise<QueryResult<VisitPlanWithRelations[]>> {
  const supabase = await createClient()
  const [plansResult, targetsResult] = await Promise.all([
    supabase
      .from("visit_plans")
      .select("*, employee:employees(id,employee_no,first_name,last_name,email)")
      .order("start_date", { ascending: false }),
    supabase
      .from("visit_plan_outlets")
      .select("*, outlet:outlets(id,code,name,address)"),
  ])

  logError("visit-plans", plansResult.error)
  logError("visit-plan-outlets", targetsResult.error)
  if (plansResult.error || !plansResult.data) return empty([])

  const targets = (targetsResult.data ?? []) as (VisitPlanOutlet & {
    outlet: OutletSummary | null
  })[]

  return empty(
    (plansResult.data as (VisitPlan & { employee: EmployeeSummary | null })[]).map(
      (plan) => ({
        ...plan,
        targets: targets.filter((target) => target.plan_id === plan.id),
      })
    )
  )
}

export type VisitWithRelations = Visit & {
  employee: EmployeeSummary | null
  outlet: OutletSummary | null
}

export async function getVisits(): Promise<QueryResult<VisitWithRelations[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("visits")
    .select(
      "*, employee:employees(id,employee_no,first_name,last_name,email), outlet:outlets(id,code,name,address)"
    )
    .order("check_in_at", { ascending: false })

  logError("visits", error)
  return empty((data as VisitWithRelations[] | null) ?? [])
}
