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
const token = data.session.access_token

const jwksStart = performance.now()
const jwks = await fetch(`${url}/auth/v1/.well-known/jwks.json`).then((r) => r.json())
console.log("jwks fetch:", Math.round(performance.now() - jwksStart), "ms", jwks.keys?.map((k) => k.kid))

for (let i = 0; i < 3; i++) {
  const fresh = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const start = performance.now()
  const result = await fresh.auth.getClaims(token)
  console.log(
    `fresh client getClaims #${i + 1}:`,
    Math.round(performance.now() - start),
    "ms",
    result.error?.message ?? "ok"
  )
}

for (let i = 0; i < 2; i++) {
  const fresh = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const start = performance.now()
  const result = await fresh.auth.getUser(token)
  console.log(
    `fresh client getUser #${i + 1}:`,
    Math.round(performance.now() - start),
    "ms",
    result.error?.message ?? "ok"
  )
}
