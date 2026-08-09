import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"

const npmCli = process.env.npm_execpath?.trim()
  || join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")

function run(command, args) {
  return spawnSync(command, args, {
    env: process.env,
    shell: false,
    stdio: "inherit",
  })
}

const reset = run(process.execPath, [npmCli, "run", "db:reset"])
if (reset.status === 0) process.exit(0)

if (process.platform !== "win32") process.exit(reset.status ?? 1)

process.stdout.write("\n[release] Database reset returned non-zero on Windows; restarting the local stack before schema tests.\n")
const stopped = run(process.execPath, [npmCli, "run", "db:stop"])
if (stopped.status !== 0) process.exit(stopped.status ?? 1)
const started = run(process.execPath, [npmCli, "run", "db:start"])
if (started.status !== 0) process.exit(started.status ?? 1)

// A genuine migration/seed error remains visible in the database tests that
// immediately follow this recovery. This branch exists for Docker DNS loss
// during the post-reset Storage restart documented in AGENTS.md.
