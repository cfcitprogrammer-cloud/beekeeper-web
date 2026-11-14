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

async function timed(label, fn) {
  const times = []
  let count = 0
  let err = "-"
  for (let i = 0; i < 3; i++) {
    const start = performance.now()
    const res = await fn()
    times.push(Math.round(performance.now() - start))
    count = Array.isArray(res.data) ? res.data.length : res.data ? 1 : 0
    err = res.error?.message ?? "-"
  }
  console.log(`${label}: ${times.join("ms ")}ms rows=${count} err=${err}`)
}

await timed("latest+embed", () =>
  authed
    .from("bookings")
    .select(
      "id, booking_no, booking_date, total, line_count, status, outlet:outlets(name,address,code)"
    )
    .order("booking_date", { ascending: false })
    .limit(5)
)
await timed("latest no-embed", () =>
  authed
    .from("bookings")
    .select("id, booking_no, booking_date, total, line_count, status, outlet_id")
    .order("booking_date", { ascending: false })
    .limit(5)
)
await timed("latest order created_at", () =>
  authed
    .from("bookings")
    .select("id, booking_no, booking_date, total, line_count, status, outlet_id")
    .order("created_at", { ascending: false })
    .limit(5)
)
await timed("outlets full map", () =>
  authed.from("outlets").select("id,name,address,code,status,is_active")
)
await timed("outlets narrow", () => authed.from("outlets").select("status,is_active"))
await timed("bookings status only", () => authed.from("bookings").select("status"))
await timed("attendance first_in", () =>
  authed.from("attendance_daily").select("first_in")
)
await timed("employees status", () => authed.from("employees").select("status"))
