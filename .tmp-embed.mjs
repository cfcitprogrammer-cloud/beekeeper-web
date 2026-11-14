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

const start = performance.now()
const res = await authed
  .from("company_members")
  .select(
    "company_id, role_id, role:roles(id,name,is_system,permissions:role_permissions(permission_key)), company:companies(*, workspaces(*), workspace_locations(*))"
  )
  .eq("user_id", data.session.user.id)
  .order("created_at")
  .limit(1)
  .maybeSingle()
console.log("ms:", Math.round(performance.now() - start), "error:", res.error?.message ?? "-")
console.log("role:", res.data?.role?.name, "perms:", res.data?.role?.permissions?.length)
console.log("company:", res.data?.company?.name, "workspaces:", res.data?.company?.workspaces?.length, "locations:", res.data?.company?.workspace_locations?.length)
console.log("workspace keys:", Object.keys(res.data?.company?.workspaces?.[0] ?? {}).slice(0, 8))
