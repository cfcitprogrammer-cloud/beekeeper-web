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

const res = await authed
  .from("my_pending_approvals")
  .select("*, requester:employees!requested_by(first_name,last_name)")
  .limit(1)
console.log("view embed:", res.error?.message ?? "ok", JSON.stringify(res.data))
