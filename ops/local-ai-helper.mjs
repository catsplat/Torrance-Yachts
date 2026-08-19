#!/usr/bin/env node
/*
 * Development helper for a future signed Torrance Local AI macOS app.
 * It connects outward to the application and only reports local Ollama status.
 * It deliberately does not expose port 11434 or accept remote commands yet.
 */
import { chmod, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

const argumentsByName = Object.fromEntries(process.argv.slice(2).flatMap((value, index, values) => value.startsWith("--") ? [[value.slice(2), values[index + 1]]] : []))
const server = argumentsByName.server?.replace(/\/$/, "")
const pairingCode = argumentsByName.code
const deviceName = argumentsByName.name || "MacBook"
const tokenPath = join(homedir(), ".torrance-local-ai-token")

if (!server || !/^https:\/\//.test(server)) throw new Error("Use --server https://your-torrance-address")

async function loadToken() {
  try { return (await readFile(tokenPath, "utf8")).trim() } catch { return "" }
}

async function pair() {
  if (!pairingCode) return ""
  const response = await fetch(`${server}/api/local-ai/pair`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pairingCode, deviceName }) })
  const body = await response.json()
  if (!response.ok || !body.agentToken) throw new Error(body.error || "Pairing failed")
  await writeFile(tokenPath, `${body.agentToken}\n`, { mode: 0o600 })
  await chmod(tokenPath, 0o600)
  return body.agentToken
}

async function ollamaStatus() {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(3000) })
    const body = await response.json()
    return { model: body.models?.[0]?.name, status: "available" }
  } catch { return { status: "offline" } }
}

const token = await loadToken() || await pair()
if (!token) throw new Error("Pair once with --code, then run without it.")
const report = async () => {
  const status = await ollamaStatus()
  const response = await fetch(`${server}/api/local-ai/status`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(status) })
  if (!response.ok) throw new Error("The paired helper was rejected. Create a new pairing code.")
  console.log(`Torrance Local AI: ${status.status}${status.model ? ` (${status.model})` : ""}`)
}
await report()
setInterval(() => report().catch((error) => console.error(error.message)), 60_000)
