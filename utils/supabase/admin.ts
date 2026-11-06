// utils/supabase/admin.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Returns a Supabase client using the service role key when available.
 * Returns null when the service role key is not configured, in which case
 * callers should fall back to the anon-key client (e.g. signUp).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) return null

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}