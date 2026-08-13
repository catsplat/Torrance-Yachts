import { execFileSync, spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"

const image = `torrance-yachts-platform:smoke-${randomUUID().slice(0, 8)}`
const container = `torrance-yachts-smoke-${randomUUID().slice(0, 8)}`

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", stdio: "pipe", ...options }).trim()
}

async function waitForHealth(port) {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health/live`, {
        signal: AbortSignal.timeout(2_000),
      })
      const payload = await response.json()
      if (response.ok && payload.status === "ok") return payload
    } catch {
      // The container may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error("The production container did not become live within 45 seconds.")
}

try {
  execFileSync("docker", [
    "build",
    "--build-arg", "DEPLOYMENT_VERSION=container-smoke",
    "--build-arg", "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co",
    "--build-arg", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-publishable-key",
    "--tag", image,
    "--file", "deploy/production/Dockerfile",
    ".",
  ], { stdio: "inherit" })
  run("docker", ["run", "--detach", "--name", container, "--publish", "127.0.0.1::3000", image])
  const portOutput = run("docker", ["port", container, "3000/tcp"])
  const port = Number(portOutput.match(/:(\d+)$/)?.[1])
  if (!Number.isInteger(port)) throw new Error("Docker did not publish the smoke-test port.")
  const health = await waitForHealth(port)
  execFileSync("docker", ["exec", container, "sh", "-c",
    "test ! -e /app/.git && test ! -e /app/.env.local && test ! -e /app/node_modules/.bin/next"],
  )
  console.log(`Production container smoke test passed for ${health.service} ${health.version}.`)
} catch (error) {
  const logs = spawnSync("docker", ["logs", container], { encoding: "utf8" })
  if (logs.stdout) process.stderr.write(logs.stdout)
  if (logs.stderr) process.stderr.write(logs.stderr)
  throw error
} finally {
  spawnSync("docker", ["rm", "--force", container], { stdio: "ignore" })
  spawnSync("docker", ["image", "rm", "--force", image], { stdio: "ignore" })
}

