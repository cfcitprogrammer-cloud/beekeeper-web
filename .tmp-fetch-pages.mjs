import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()] }))
const url = env.NEXT_PUBLIC_SUPABASE_URL
const ref = new URL(url).hostname.split(".")[0]
const supabase = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data, error } = await supabase.auth.signInWithPassword({ email: "superadmin@example.com", password: "ChangeMe123!" })
if (error) throw error
const payload = JSON.stringify(data.session)
const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(payload, "utf8").toString("base64url")}`

for (const path of ["/production/usage/new", "/production/stages", "/production/usage", "/production/usage/my"]) {
  const res = await fetch(`http://localhost:3000${path}`, { headers: { cookie }, redirect: "manual" })
  const text = await res.text()
  console.log(`\n=== ${path} status=${res.status} location=${res.headers.get("location") ?? ""} length=${text.length}`)
  for (const needle of ["SNACKFOOD", "blending", "TOCHI", "Add another SKU", "No SKUs assigned", "Select a stage first", "Record usage", "prod_usage"]) {
    const idx = text.indexOf(needle)
    if (idx >= 0) console.log(`  found "${needle}" @${idx}: ...${text.slice(Math.max(0, idx-120), idx+200).replace(/\s+/g, " ")}...`)
  }
}
