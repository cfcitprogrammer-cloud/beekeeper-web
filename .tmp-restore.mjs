import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()] }))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const row = {
  id: "0e7a9fdc-99d8-4597-a101-d44edf215409",
  company_id: "22222222-2222-4222-8222-222222222222",
  workspace_id: "33333333-3333-4333-8333-333333333333",
  pipeline_id: "e325db5d-54ec-46ae-b885-3e1188967e30",
  run_id: null,
  stage_id: "c6e13478-f0a3-4a9f-b0ac-2022b3afdbba",
  source_stage_id: null,
  input_quantity: 0,
  output_quantity: 0,
  waste_quantity: 0,
  uom: "BOX",
  notes: null,
  recorded_by: "11111111-1111-4111-8111-111111111111",
  recorded_at: "2026-11-12T01:25:14.772+00:00",
  created_at: "2026-11-12T01:25:14.942869+00:00",
  updated_at: "2026-11-12T02:03:07.550831+00:00",
  sku_id: "8dfa49f1-e2b0-4798-982d-ee35cdf1783c",
  quantity: 1515,
  submitted_by: "11111111-1111-4111-8111-111111111111",
  usage_date: "2026-11-12",
  batch_id: "0e7a9fdc-99d8-4597-a101-d44edf215409",
}
const { data, error } = await supabase.from("production_usage").insert(row).select("*")
console.log("restore error:", error?.message ?? null)
console.log("restored:", JSON.stringify(data))
