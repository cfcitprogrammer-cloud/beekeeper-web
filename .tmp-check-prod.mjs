import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()] }))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: signin, error: signinErr } = await supabase.auth.signInWithPassword({ email: "superadmin@example.com", password: "ChangeMe123!" })
if (signinErr) throw signinErr
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${signin.session.access_token}` } },
  auth: { persistSession: false },
})
const { data: stages, error: stagesErr } = await client.from("production_stages").select("*")
console.log("stages error:", stagesErr?.message ?? null, "rows:", stages?.length)
const { data: assignments, error: assignErr } = await client.from("production_stage_skus").select("*")
console.log("assignments error:", assignErr?.message ?? null, "rows:", assignments?.length)
const now = new Date().toISOString()
const batchId = crypto.randomUUID()
const rows = [
  { company_id: "22222222-2222-4222-8222-222222222222", workspace_id: "33333333-3333-4333-8333-333333333333", pipeline_id: "e325db5d-54ec-46ae-b885-3e1188967e30", stage_id: "c6e13478-f0a3-4a9f-b0ac-2022b3afdbba", batch_id: batchId, sku_id: "8dfa49f1-e2b0-4798-982d-ee35cdf1783c", quantity: 1, uom: "BOX", usage_date: now.slice(0,10), submitted_by: signin.user.id, recorded_by: signin.user.id, recorded_at: now, updated_at: now },
  { company_id: "22222222-2222-4222-8222-222222222222", workspace_id: "33333333-3333-4333-8333-333333333333", pipeline_id: "e325db5d-54ec-46ae-b885-3e1188967e30", stage_id: "c6e13478-f0a3-4a9f-b0ac-2022b3afdbba", batch_id: batchId, sku_id: "0debc937-03d0-49ed-91cd-dea66c61070f", quantity: 2, uom: "PACK", usage_date: now.slice(0,10), submitted_by: signin.user.id, recorded_by: signin.user.id, recorded_at: now, updated_at: now },
]
const { data: inserted, error } = await client.from("production_usage").insert(rows).select("id,batch_id,sku_id,quantity,uom")
console.log("insert error:", error?.message ?? null)
console.log("inserted:", JSON.stringify(inserted))
if (inserted?.length) {
  const del = await client.from("production_usage").delete().eq("batch_id", batchId)
  console.log("cleanup error:", del.error?.message ?? null)
}
