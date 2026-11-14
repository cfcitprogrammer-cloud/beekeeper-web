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

async function one(label, fn) {
  const start = performance.now()
  const res = await fn()
  const ms = Math.round(performance.now() - start)
  const rows = Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0
  console.log(`${label}: ${ms}ms rows=${rows} err=${res.error?.message ?? "-"}`)
}

for (let run = 0; run < 2; run++) {
  const parallelStart = performance.now()
  await Promise.all([
    one("access.embed", () =>
      authed
        .from("company_members")
        .select(
          "company_id, role_id, role:roles(id,name,is_system,permissions:role_permissions(permission_key)), company:companies(*, workspaces(*), workspace_locations(*))"
        )
        .eq("user_id", data.session.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle()
    ),
    one("pending.view", () => authed.from("my_pending_approvals").select("*")),
    one("names.all", () =>
      authed.from("employees").select("user_id, first_name, last_name")
    ),
    one("employees.snapshot", () =>
      authed.from("employees").select("id, first_name, last_name, status")
    ),
    one("attendance.first_in", () =>
      authed.from("attendance_daily").select("first_in")
    ),
    one("bookings.status", () => authed.from("bookings").select("status")),
    one("bookings.latest", () =>
      authed
        .from("bookings")
        .select(
          "id, booking_no, booking_date, total, line_count, status, outlet_id"
        )
        .order("booking_date", { ascending: false })
        .limit(5)
    ),
    one("outlets", () =>
      authed.from("outlets").select("id, name, address, code, status, is_active")
    ),
    one("leave.upcoming", () =>
      authed
        .from("leave_requests")
        .select("id, start_date, days, employee_id, leave_type_id")
        .eq("status", "approved")
        .order("start_date", { ascending: true })
        .limit(4)
    ),
    one("leave.types", () => authed.from("leave_types").select("id, code")),
    one("leave.pending", () =>
      authed
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
    ),
  ])
  console.log(
    `RUN ${run + 1} ALL PARALLEL:`,
    Math.round(performance.now() - parallelStart),
    "ms"
  )
}
