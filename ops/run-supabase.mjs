import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const projectRoot = resolve(import.meta.dirname, "..")
const localEnvironment = resolve(projectRoot, ".env.local")

if (existsSync(localEnvironment)) {
  process.loadEnvFile(localEnvironment)
}

const supabaseCli = resolve(projectRoot, "node_modules", "supabase", "dist", "supabase.js")
const result = spawnSync(process.execPath, [supabaseCli, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: process.env,
  shell: false,
  stdio: "inherit",
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
