import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()] }))
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data, error } = await supabase.auth.signInWithPassword({ email: "superadmin@example.com", password: "ChangeMe123!" })
if (error) throw error
const cookieValue = `base64-${Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url")}`
const target = await (await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" })).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let id = 0; const pending = new Map(); const events = []
ws.onmessage = (msg) => { const p = JSON.parse(msg.data); if (p.id && pending.has(p.id)) { pending.get(p.id)(p); pending.delete(p.id) } else if (p.method) events.push(p) }
function send(method, params = {}) { return new Promise((resolve) => { const msgId = ++id; pending.set(msgId, resolve); ws.send(JSON.stringify({ id: msgId, method, params })) }) }
async function evaluate(expression) { const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (res.result?.exceptionDetails) return { __error: JSON.stringify(res.result.exceptionDetails) }; return res.result?.result?.value }
async function waitFor(expression, timeoutMs = 25000) { const start = Date.now(); while (Date.now() - start < timeoutMs) { if (await evaluate(expression)) return true; await new Promise((r) => setTimeout(r, 400)) } return false }
const setSelect = (selector, value) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'missing'; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value })()`
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable")
await send("Network.setCookie", { name: `sb-${ref}-auth-token`, value: cookieValue, domain: "localhost", path: "/", httpOnly: false, secure: false })
await send("Page.navigate", { url: "http://localhost:3000/production/usage/new" })
await waitFor("Boolean(document.querySelector('#usage-pipeline'))")
await evaluate(setSelect("#usage-pipeline", "e325db5d-54ec-46ae-b885-3e1188967e30"))
await new Promise((r) => setTimeout(r, 700))
await evaluate(setSelect("#usage-stage", "c6e13478-f0a3-4a9f-b0ac-2022b3afdbba"))
await new Promise((r) => setTimeout(r, 700))
// add second line
await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Add another SKU')); b?.click(); return true })()`)
await new Promise((r) => setTimeout(r, 500))
// select skus
await evaluate(setSelect('select[aria-label="SKU line 1"]', "8dfa49f1-e2b0-4798-982d-ee35cdf1783c"))
await new Promise((r) => setTimeout(r, 300))
await evaluate(setSelect('select[aria-label="SKU line 2"]', "0debc937-03d0-49ed-91cd-dea66c61070f"))
await new Promise((r) => setTimeout(r, 500))
// type quantities with real key input
await evaluate(`document.querySelector('input[aria-label="Quantity for SKU line 1"]').focus()`)
await send("Input.insertText", { text: "11" })
await evaluate(`document.querySelector('input[aria-label="Quantity for SKU line 2"]').focus()`)
await send("Input.insertText", { text: "22" })
await new Promise((r) => setTimeout(r, 400))
const before = await evaluate(`(() => ({ values: [...document.querySelectorAll('select[aria-label^="SKU line"]')].map(s => s.value), quantities: [...document.querySelectorAll('input[aria-label^="Quantity for SKU line"]')].map(i => i.value), recordDisabled: [...document.querySelectorAll('button')].find(x => x.textContent.includes('Record usage'))?.disabled }))()`)
console.log("BEFORE SUBMIT", JSON.stringify(before, null, 2))
await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Record usage')); b?.click(); return true })()`)
await new Promise((r) => setTimeout(r, 5000))
console.log("after url:", await evaluate("location.href"))
console.log("body:", (await evaluate("document.body.innerText")).slice(0, 900))
const { data: rows, error: rowsError } = await supabase.from("production_usage").select("id,batch_id,sku_id,quantity,uom,notes,submitted_by").in("sku_id", ["8dfa49f1-e2b0-4798-982d-ee35cdf1783c","0debc937-03d0-49ed-91cd-dea66c61070f"]).gte("quantity", 11)
console.log("db rows error:", rowsError?.message ?? null)
console.log("db rows:", JSON.stringify(rows))
if (rows?.length) {
  const batchIds = [...new Set(rows.map(r => r.batch_id))]
  await supabase.from("production_usage").delete().in("batch_id", batchIds)
  console.log("cleaned batches", batchIds)
}
console.log("exceptions:", JSON.stringify(events.filter(e => e.method === 'Runtime.exceptionThrown' || e.method === 'Log.entryAdded').slice(-8), null, 2))
ws.close()
