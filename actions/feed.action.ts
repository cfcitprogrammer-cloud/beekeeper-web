"use server"

import {
  failure,
  getAuthorizedContext,
  type ActionResult,
} from "@/actions/helpers/context"
import { PERMISSIONS } from "@/lib/auth/permissions"

export type FeedItem = {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  metadata: Record<string, unknown>
  actor_name: string | null
  created_at: string
}

const FEED_COLUMNS =
  "id, action, entity_type, entity_id, summary, metadata, actor_user_id, actor_employee_id, created_at"

export async function getActivityFeed(limit = 75): Promise<ActionResult<FeedItem[]>> {
  const authorized = await getAuthorizedContext(PERMISSIONS.FEED_VIEW)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context
  const safeLimit = Math.min(Math.max(limit, 1), 200)

  const { data, error } = await supabase
    .from("activity_feed")
    .select(FEED_COLUMNS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error("[action:getActivityFeed]", error)
    return failure(error.message)
  }

  const rows = (data ?? []) as {
    id: string
    action: string
    entity_type: string
    entity_id: string | null
    summary: string
    metadata: Record<string, unknown> | null
    actor_user_id: string | null
    actor_employee_id: string | null
    created_at: string
  }[]

  const employeeIds = Array.from(
    new Set(rows.map((row) => row.actor_employee_id).filter(Boolean))
  ) as string[]

  const names = new Map<string, string>()
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .in("id", employeeIds)
    for (const employee of (employees ?? []) as {
      id: string
      first_name: string
      last_name: string
    }[]) {
      names.set(employee.id, `${employee.first_name} ${employee.last_name}`)
    }
  }

  return {
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      summary: row.summary,
      metadata: row.metadata ?? {},
      actor_name: row.actor_employee_id
        ? (names.get(row.actor_employee_id) ?? null)
        : null,
      created_at: row.created_at,
    })),
  }
}

export type MonitoringSnapshot = {
  workspace_id: string
  workspace_name: string
  active_employees: number
  active_outlets: number
  active_assignments: number
  visits_today: number
  unplanned_visits_7d: number
  open_expense_plans: number
  pending_expenses: number
  runs_in_progress: number
  activity_24h: number
}

export async function getMonitoringSnapshot(): Promise<
  ActionResult<MonitoringSnapshot[]>
> {
  const authorized = await getAuthorizedContext(PERMISSIONS.FEED_VIEW)
  if ("error" in authorized) return authorized.error

  const { supabase, companyId } = authorized.context
  const { data, error } = await supabase
    .from("operational_monitoring")
    .select("*")
    .eq("company_id", companyId)
    .order("workspace_name")

  if (error) {
    console.error("[action:getMonitoringSnapshot]", error)
    return failure(error.message)
  }

  return { success: true, data: (data ?? []) as MonitoringSnapshot[] }
}
