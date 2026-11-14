import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const url = env.NEXT_PUBLIC_SUPABASE_URL
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function timed(label, fn) {
  const start = performance.now()
  const result = await fn()
  const ms = Math.round(performance.now() - start)
  const count = Array.isArray(result?.data)
    ? result.data.length
    : result?.data
      ? 1
      : 0
  console.log(`${label}: ${ms}ms (rows=${count}, err=${result?.error?.message ?? "-"})`)
  return result
}

const client = createClient(url, anon, { auth: { persistSession: false } })
const signIn = await client.auth.signInWithPassword({
  email: "superadmin@example.com",
  password: "ChangeMe123!",
})
const session = signIn.data.session
const authed = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  auth: { persistSession: false },
})

await timed("auth.getClaims", () => authed.auth.getClaims(session.access_token))
await timed("auth.getSession", () => authed.auth.getSession())

const cm = await authed
  .from("company_members")
  .select(
    "company_id, role_id, role:roles(id,name,is_system,permissions:role_permissions(permission_key))"
  )
  .eq("user_id", session.user.id)
  .order("created_at")
  .limit(1)
  .maybeSingle()
console.log("embedded company_member:", JSON.stringify(cm.error ?? cm.data))
const companyId = cm.data?.company_id

await timed("companies bundle", () =>
  authed
    .from("companies")
    .select("*, workspaces(*), workspace_locations(*)")
    .eq("id", companyId)
    .maybeSingle()
)

await timed("workspace_members embed", () =>
  authed
    .from("workspace_members")
    .select("workspace_id, company_id, role_id, role:roles(id,name,is_system)")
    .eq("user_id", session.user.id)
)
