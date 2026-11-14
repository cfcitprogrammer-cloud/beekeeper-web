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
const ref = new URL(url).hostname.split(".")[0]
const supabase = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const { data, error } = await supabase.auth.signInWithPassword({
  email: "superadmin@example.com",
  password: "ChangeMe123!",
})
if (error) throw error
const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(
  JSON.stringify(data.session),
  "utf8"
).toString("base64url")}`

const routes = ["/home", "/dashboard", "/employees", "/production/stages", "/bookings"]
for (const route of routes) {
  const times = []
  let status = 0
  for (let i = 0; i < 3; i++) {
    const start = performance.now()
    const res = await fetch(`http://localhost:3000${route}`, {
      headers: { cookie },
      redirect: "manual",
    })
    status = res.status
    await res.text()
    times.push(Math.round(performance.now() - start))
  }
  console.log(route, status, times.join("ms  ") + "ms")
}
