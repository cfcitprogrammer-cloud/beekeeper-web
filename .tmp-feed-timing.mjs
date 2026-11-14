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
const client = createClient(url, anon, { auth: { persistSession: false } })
const { data } = await client.auth.signInWithPassword({
  email: "superadmin@example.com",
  password: "ChangeMe123!",
})
const authed = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  auth: { persistSession: false },
})
const companyId = "22222222-2222-4222-8222-222222222222"

async function timed(label, fn) {
  const times = []
  let rows = 0
  let err = "-"
  for (let i = 0; i < 3; i++) {
    const start = performance.now()
    const res = await fn()
    times.push(Math.round(performance.now() - start))
    rows = Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0
    err = res.error?.message ?? "-"
  }
  console.log(`${label}: ${times.join("ms ")}ms rows=${rows} err=${err}`)
}

await timed("feed 100 embed", () =>
  authed
    .from("activity_feed")
    .select(
      "id, action, entity_type, entity_id, summary, metadata, actor_user_id, actor_employee_id, created_at, actor:employees!actor_employee_id(first_name,last_name)"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100)
)
await timed("feed 100 no embed", () =>
  authed
    .from("activity_feed")
    .select(
      "id, action, entity_type, entity_id, summary, metadata, actor_user_id, actor_employee_id, created_at"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(100)
)
await timed("monitoring order", () =>
  authed
    .from("operational_monitoring")
    .select("*")
    .eq("company_id", companyId)
    .order("workspace_name")
)
await timed("monitoring no order", () =>
  authed.from("operational_monitoring").select("*").eq("company_id", companyId)
)
await timed("access embed", () =>
  authed
    .from("company_members")
    .select(
      "company_id, role_id, role:roles(id,name,is_system,permissions:role_permissions(permission_key)), company:companies(*, workspaces(*), workspace_locations(*))"
    )
    .eq("user_id", data.session.user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle()
)
