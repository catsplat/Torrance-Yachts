import { mkdir, writeFile } from "node:fs/promises"

const appUrl = (process.env.TORRANCE_APP_URL || "http://app:3000").replace(/\/$/, "")
const secret = process.env.AUTOMATION_SHARED_SECRET?.trim()
const intervalMs = Number.parseInt(process.env.AUTOMATION_INTERVAL_MS || "60000", 10)
const heartbeatFile = process.env.AUTOMATION_HEARTBEAT_FILE || "/tmp/torrance-automation/heartbeat"

if (!secret || secret.length < 32) {
  console.error("AUTOMATION_SHARED_SECRET is required and must be at least 32 characters.")
  process.exit(1)
}

const endpoints = [
  "/api/integrations/automation/tick",
  "/api/integrations/automation/dispatch-alerts",
  "/api/integrations/automation/dispatch-google-workspace",
]

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function callEndpoint(path) {
  const response = await fetch(`${appUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`)
}

async function recordHeartbeat() {
  const directory = heartbeatFile.slice(0, heartbeatFile.lastIndexOf("/"))
  await mkdir(directory, { recursive: true })
  await writeFile(heartbeatFile, `${new Date().toISOString()}\n`, { mode: 0o600 })
}

async function runCycle() {
  for (const endpoint of endpoints) await callEndpoint(endpoint)
  await recordHeartbeat()
  console.log(JSON.stringify({ component: "automation-worker", event: "cycle_completed", at: new Date().toISOString() }))
}

console.log(JSON.stringify({ component: "automation-worker", event: "started", intervalMs }))
while (true) {
  const startedAt = Date.now()
  try {
    await runCycle()
  } catch (error) {
    console.error(JSON.stringify({
      component: "automation-worker",
      event: "cycle_failed",
      message: error instanceof Error ? error.message : "Unknown automation worker error",
      at: new Date().toISOString(),
    }))
  }
  await delay(Math.max(1_000, intervalMs - (Date.now() - startedAt)))
}
