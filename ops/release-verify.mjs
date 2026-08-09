import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { connect } from "node:net"
import { dirname, join } from "node:path"

const startedAt = new Date()
const results = []
const expectedNpm = "11.6.2"
const npmCli = process.env.npm_execpath?.trim()
  || join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")

function portIsOpen(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port })
    socket.setTimeout(500)
    socket.once("connect", () => { socket.destroy(); resolve(true) })
    socket.once("error", () => resolve(false))
    socket.once("timeout", () => { socket.destroy(); resolve(false) })
  })
}

function run(label, command, args) {
  const start = Date.now()
  process.stdout.write(`\n[release] ${label}\n`)
  try {
    execFileSync(command, args, { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } })
    results.push({ durationMs: Date.now() - start, label, status: "passed" })
  } catch (error) {
    results.push({ durationMs: Date.now() - start, label, status: "failed" })
    writeReport("failed")
    process.exit(typeof error.status === "number" ? error.status : 1)
  }
}

function runNpm(label, args) {
  run(label, process.execPath, [npmCli, ...args])
}

function writeReport(status) {
  mkdirSync(".artifacts", { recursive: true })
  writeFileSync(".artifacts/release-verification.json", JSON.stringify({
    finishedAt: new Date().toISOString(), node: process.version,
    results, startedAt: startedAt.toISOString(), status,
  }, null, 2))
}

if (await portIsOpen(3000)) {
  throw new Error("Port 3000 is in use. Stop the local application before release verification so the production build cannot be locked or masked.")
}

if (Number(process.versions.node.split(".")[0]) !== 24) {
  throw new Error(`Release verification requires Node 24; found ${process.version}.`)
}
const npmVersion = execFileSync(process.execPath, [npmCli, "--version"], { encoding: "utf8" }).trim()
if (npmVersion !== expectedNpm) {
  throw new Error(`Release verification requires npm ${expectedNpm}; found ${npmVersion}.`)
}

if (process.env.RELEASE_ALLOW_DIRTY !== "true") {
  const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
  if (status) throw new Error("Release verification requires a clean checkout. Commit or stash changes first.")
}

runNpm("Locked dependency install", ["ci"])
runNpm("Lint, types and unit tests", ["run", "check"])
run("Clean local database migration", "node", ["ops/reset-local-database-for-release.mjs"])
runNpm("Database tests", ["run", "db:test"])
runNpm("Database lint", ["run", "db:lint"])
if (process.platform === "win32") {
  run("Disposable backup and restore drill", "powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "ops/backup/local-restore-drill.ps1",
  ])
}
runNpm("Automation contracts", ["run", "automation:validate"])
runNpm("Production package contracts", ["run", "production:validate"])
runNpm("Production build", ["run", "build"])
runNpm("Production dependency audit", ["audit", "--omit=dev", "--audit-level=high"])
run("Prepare synthetic browser identities", "node", ["ops/e2e/prepare-local-environment.mjs"])
runNpm("Cross-browser acceptance", ["run", "test:e2e"])
writeReport("passed")
process.stdout.write("\n[release] All pre-bake verification gates passed.\n")
