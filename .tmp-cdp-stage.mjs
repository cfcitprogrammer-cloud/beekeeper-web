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
  if (res.result?.exceptionDetails) return { error: JSON.stringify(res.result.exceptionDetails) }
  return res.result?.result?.value
}
async function waitFor(expression, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const value = await evaluate(expression)
    if (value) return value
    await new Promise((r) => setTimeout(r, 400))
  }
  return null
}
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable")
await send("Network.setCookie", { name: `sb-${ref}-auth-token`, value: cookieValue, domain: "localhost", path: "/", httpOnly: false, secure: false })

// ---------- Stage creation ----------
await send("Page.navigate", { url: "http://localhost:3000/production/stages/new?pipelineId=e325db5d-54ec-46ae-b885-3e1188967e30" })
await waitFor("Boolean(document.querySelector('#st-name'))")
const stageName = `QA stage ${Date.now()}`
const setInput = (selector, value) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'missing'; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value })()`
console.log("fill name:", await evaluate(setInput("#st-name", stageName)))
await new Promise((r) => setTimeout(r, 300))
console.log("click add:", await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Add stage')); if (!b) return 'missing'; b.click(); return 'clicked' })()`))
await new Promise((r) => setTimeout(r, 3000))
const afterStage = await evaluate(`(() => ({ url: location.href, body: document.body.innerText.slice(0, 500) }))()`)
console.log("STAGE RESULT", JSON.stringify(afterStage, null, 2))
const { data: createdStages, error: stageLookupError } = await supabase.from("production_stages").select("id,name,sequence").eq("name", stageName)
console.log("stage lookup error:", stageLookupError?.message ?? null, "created:", createdStages)
if (createdStages?.length) {
  await supabase.from("production_stages").delete().in("id", createdStages.map(s => s.id))
  console.log("stage cleanup done")
}
console.log("stage events:", JSON.stringify(events.filter(e => e.method === 'Runtime.exceptionThrown' || e.method === 'Log.entryAdded').slice(-5), null, 2))
ws.close()
