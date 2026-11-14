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
  try {
    const result = await fn()
    const ms = Math.round(performance.now() - start)
    const count = Array.isArray(result?.data)
      ? result.data.length
      : result?.data
        ? 1
        : 0
    console.log(`${label}: ${ms}ms (rows=${count}, err=${result?.error?.message ?? "-"})`)
    return result
  } catch (e) {
    console.log(`${label}: FAILED ${e.message}`)
  }
}

const client = createClient(url, anon, { auth: { persistSession: false } })
const signIn = await timed("signIn", () =>
  client.auth.signInWithPassword({
    email: "superadmin@example.com",
    password: "ChangeMe123!",
  })
)
const session = signIn.data.session
const authed = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  auth: { persistSession: false },
})

await timed("auth.getUser", () => authed.auth.getUser(session.access_token))
await timed("employee", () =>
  authed.from("employees").select("id, company_id, workspace_id, first_name, last_name, email").eq("user_id", session.user.id).maybeSingle()
)
const cm = await timed("company_members", () =>
  authed.from("company_members").select("company_id, role_id").eq("user_id", session.user.id).order("created_at").limit(1).maybeSingle()
)
const wm = await timed("workspace_members", () =>
  authed.from("workspace_members").select("workspace_id, company_id, role_id").eq("user_id", session.user.id)
)
const companyId = cm.data?.company_id
await timed("company", () => authed.from("companies").select("*").eq("id", companyId).maybeSingle())
await timed("workspaces", () => authed.from("workspaces").select("*").eq("company_id", companyId).eq("is_active", true).order("name"))
await timed("locations", () => authed.from("workspace_locations").select("*").eq("company_id", companyId).eq("is_active", true).order("name"))
const roleIds = [...new Set([cm.data?.role_id, ...wm.data.map((r) => r.role_id)].filter(Boolean))]
await timed("roles", () => authed.from("roles").select("id, name, is_system").in("id", roleIds))
await timed("role_permissions", () => authed.from("role_permissions").select("role_id, permission_key").in("role_id", roleIds))
await timed("pending_approvals", () => authed.from("my_pending_approvals").select("*").order("requested_at", { ascending: true }))
await timed("pending_count", () => authed.from("my_pending_approvals").select("request_stage_id", { count: "exact", head: true }))
await timed("employees_full", () =>
  authed.from("employees").select("*, department:departments(id,name,code), position:positions(id,title), manager:employees!manager_id(id,first_name,last_name)").order("last_name")
)
await timed("attendance_daily", () => authed.from("attendance_daily").select("*").order("work_date", { ascending: false }))
await timed("bookings", () =>
  authed.from("bookings").select("*, outlet:outlets(id,code,name,address), employee:employees(id,first_name,last_name,employee_no)").order("booking_date", { ascending: false })
)
await timed("outlets", () => authed.from("outlets").select("*").order("name"))
await timed("leave_requests", () =>
  authed.from("leave_requests").select("*, employee:employees(id,employee_no,first_name,last_name,avatar_path,department_id,department:departments(name)), leave_type:leave_types(*)").order("created_at", { ascending: false })
)
await timed("attendance", () =>
  authed.from("attendances").select("*, employee:employees(id,employee_no,first_name,last_name,avatar_path), location:workspace_locations(id,name,radius_m)").order("captured_at", { ascending: true })
)
