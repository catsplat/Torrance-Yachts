import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const projectRoot = resolve(import.meta.dirname, "..")
const localEnvironment = resolve(projectRoot, ".env.local")

if (existsSync(localEnvironment)) {
  process.loadEnvFile(localEnvironment)
}

const supabaseCli = resolve(projectRoot, "node_modules", "supabase", "dist", "supabase.js")
const commandArguments = process.argv.slice(2)
const suppressRoutineStartOutput = commandArguments[0] === "start" &&
  process.env.SHOW_LOCAL_SUPABASE_CONNECTION_VALUES !== "true"

const result = spawnSync(process.execPath, [supabaseCli, ...commandArguments], {
  cwd: projectRoot,
  encoding: suppressRoutineStartOutput ? "utf8" : undefined,
  env: process.env,
  shell: false,
  stdio: suppressRoutineStartOutput ? ["inherit", "pipe", "pipe"] : "inherit",
})

if (suppressRoutineStartOutput) {
  if (result.status === 0) {
    console.log("Local Supabase development stack is running. Use `npm run db:status` only when you deliberately need local connection values.")
  } else {
    // Supabase prints its local development keys on standard output. Keep failure
    // diagnostics useful without echoing those values into terminals or logs.
    const redacted = [result.stdout, result.stderr]
      .filter((value) => typeof value === "string")
      .join("\n")
      .replace(/^(\s*"?(?:ANON_KEY|API_URL|DB_URL|GRAPHQL_URL|JWT_SECRET|PUBLISHABLE_KEY|REST_URL|S3_PROTOCOL_ACCESS_KEY_ID|S3_PROTOCOL_ACCESS_KEY_SECRET|SECRET_KEY|SERVICE_ROLE_KEY|STORAGE_S3_URL)"?\s*[:=]\s*)[^,\r\n]*/gim, "$1[redacted local value]")
    if (redacted.trim()) process.stderr.write(redacted)
  }
}

if (result.error) throw result.error
process.exit(result.status ?? 1)
