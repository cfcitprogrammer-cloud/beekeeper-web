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
async function evaluate(expression) { const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); return res.result?.result?.value }
async function waitFor(expression, timeoutMs = 20000) { const start = Date.now(); while (Date.now() - start < timeoutMs) { if (await evaluate(expression)) return true; await new Promise((r) => setTimeout(r, 400)) } return false }
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable")
await send("Network.setCookie", { name: `sb-${ref}-auth-token`, value: cookieValue, domain: "localhost", path: "/", httpOnly: false, secure: false })
await send("Page.navigate", { url: "http://localhost:3000/production/stages/new?pipelineId=e325db5d-54ec-46ae-b885-3e1188967e30" })
await waitFor("Boolean(document.querySelector('#st-name'))")
await evaluate("document.querySelector('#st-name').focus()")
const stageName = `QA typed ${Date.now()}`
await send("Input.insertText", { text: stageName })
await new Promise((r) => setTimeout(r, 300))
console.log("input value now:", await evaluate("document.querySelector('#st-name').value"))
console.log("click add:", await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Add stage')); b?.click(); return Boolean(b) })()`))
await new Promise((r) => setTimeout(r, 4000))
console.log("result url:", await evaluate("location.href"))
console.log("body:", (await evaluate("document.body.innerText")).slice(0, 700))
const { data: created } = await supabase.from("production_stages").select("id,name,sequence").eq("name", stageName)
console.log("created rows:", created)
if (created?.length) { await supabase.from("production_stages").delete().in("id", created.map(s => s.id)); console.log("cleaned") }
ws.close()
