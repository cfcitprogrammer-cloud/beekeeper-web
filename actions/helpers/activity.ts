import type { ActionContext } from "@/actions/helpers/context"

type Supabase = ActionContext["supabase"]

export type ActivityInput = {
  action: string
  entityType: string
  entityId?: string | null
  summary: string
  metadata?: Record<string, unknown>
}

/**
 * Writes an entry to the shared activity feed. Activity logging is best-effort:
 * a feed failure must never roll back the business operation that produced it.
 */
export async function logActivity(
  supabase: Supabase,
  context: { companyId: string; workspaceId: string | null; userId: string | null },
  employeeId: string | null,
  input: ActivityInput
) {
  const { error } = await supabase.from("activity_feed").insert({
    company_id: context.companyId,
    workspace_id: context.workspaceId,
    actor_user_id: context.userId,
    actor_employee_id: employeeId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.error("[activity:log]", error.message)
  }
}
