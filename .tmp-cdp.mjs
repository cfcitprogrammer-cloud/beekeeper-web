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
let id = 0
const pending = new Map()
const events = []
ws.onmessage = (msg) => {
  const parsed = JSON.parse(msg.data)
  if (parsed.id && pending.has(parsed.id)) { pending.get(parsed.id)(parsed); pending.delete(parsed.id) }
  else if (parsed.method) events.push(parsed)
}
function send(method, params = {}) {
  return new Promise((resolve) => { const msgId = ++id; pending.set(msgId, resolve); ws.send(JSON.stringify({ id: msgId, method, params })) })
}
async function evaluate(expression) {
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails))
  return res.result?.result?.value
}
await send("Page.enable")
await send("Runtime.enable")
await send("Log.enable")
await send("Network.enable")
await send("Network.setCookie", { name: `sb-${ref}-auth-token`, value: cookieValue, domain: "localhost", path: "/", httpOnly: false, secure: false })
await send("Page.navigate", { url: "http://localhost:3000/production/usage/new" })
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 500))
  const ready = await evaluate("Boolean(document.querySelector('#usage-pipeline'))").catch(() => false)
  if (ready) break
}
const initial = await evaluate(`(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add another SKU'))
  const pipeline = document.querySelector('#usage-pipeline')
  return { url: location.href, pipelineOptions: pipeline ? [...pipeline.options].map(o => ({ text: o.text, value: o.value })) : null, addDisabled: btn?.disabled, addExists: Boolean(btn), skuSelects: document.querySelectorAll('select[aria-label^="SKU line"]').length }
})()`)
console.log("INITIAL", JSON.stringify(initial, null, 2))

const setSelect = (selector, value) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'missing'; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('change', { bubbles: true })); return el.value })()`
const pipelineValue = initial.pipelineOptions.find((o) => o.text.includes("SNACKFOOD"))?.value
console.log("pipeline select:", await evaluate(setSelect("#usage-pipeline", pipelineValue)))
await new Promise((r) => setTimeout(r, 800))
const afterPipeline = await evaluate(`(() => {
  const stage = document.querySelector('#usage-stage')
  return { stageOptions: stage ? [...stage.options].map(o => ({ text: o.text, value: o.value })) : null, stageDisabled: stage?.disabled }
})()`)
console.log("AFTER PIPELINE", JSON.stringify(afterPipeline, null, 2))
const stageValue = afterPipeline.stageOptions.find((o) => o.text.includes("blending"))?.value
console.log("stage select:", await evaluate(setSelect("#usage-stage", stageValue)))
await new Promise((r) => setTimeout(r, 800))
const afterStage = await evaluate(`(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add another SKU'))
  const sku = document.querySelector('select[aria-label^="SKU line"]')
  return { addDisabled: btn?.disabled, skuDisabled: sku?.disabled, skuOptions: sku ? [...sku.options].map(o => ({ text: o.text, value: o.value })) : null, skuSelects: document.querySelectorAll('select[aria-label^="SKU line"]').length }
})()`)
console.log("AFTER STAGE", JSON.stringify(afterStage, null, 2))
await evaluate(`(() => { const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add another SKU')); btn?.click(); return true })()`)
await new Promise((r) => setTimeout(r, 500))
const afterAdd = await evaluate(`(() => {
  const selects = [...document.querySelectorAll('select[aria-label^="SKU line"]')]
  return { skuSelects: selects.length, labels: selects.map(s => s.getAttribute('aria-label')), values: selects.map(s => s.value), options: selects.map(s => [...s.options].map(o => ({ text: o.text, value: o.value, disabled: o.disabled }))) }
})()`)
console.log("AFTER ADD", JSON.stringify(afterAdd, null, 2))
console.log("EVENTS", JSON.stringify(events.filter(e => e.method === 'Runtime.exceptionThrown' || e.method === 'Log.entryAdded' || e.method === 'Runtime.consoleAPICalled').map(e => ({ method: e.method, params: e.params })).slice(-10), null, 2))
ws.close()
