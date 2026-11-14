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
const { data } = await supabase.auth.signInWithPassword({
  email: "superadmin@example.com",
  password: "ChangeMe123!",
})
const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(
  JSON.stringify(data.session),
  "utf8"
).toString("base64url")}`

for (const route of ["/employees", "/dashboard", "/feed", "/home"]) {
  const results = []
  for (let i = 0; i < 3; i++) {
    const start = performance.now()
    const res = await fetch(`http://localhost:3001${route}`, {
      headers: { cookie },
      redirect: "manual",
    })
    const ttfb = Math.round(performance.now() - start)
    const body = await res.text()
    results.push(`${ttfb}ms/${Math.round(performance.now() - start)}ms(${body.length}b)`)
  }
  console.log(route.padEnd(12), results.join("  "))
}
