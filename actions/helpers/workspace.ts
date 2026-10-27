import { createClient } from "@/utils/supabase/server"

export async function getUserWorkspaceId(): Promise<number> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: No active session found.")
  }

  const { data, error: profileError } = await supabase
    .from("employees_pid")
    .select("active_workspace_id")
    .eq("auth_user_id", user.id)
    .single()

  if (profileError || !data?.active_workspace_id) {
    throw new Error("Workspace ID not found for the current user.")
  }

  return data.active_workspace_id
}
