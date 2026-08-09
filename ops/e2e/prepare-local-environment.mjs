import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const root = resolve(import.meta.dirname, "../..")
const cli = resolve(root, "node_modules/supabase/dist/supabase.js")
const target = resolve(root, process.argv[2] ?? ".env.e2e.local")

const status = JSON.parse(execFileSync(process.execPath, [cli, "status", "-o", "json"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
}))

function valueFor(...names) {
  for (const name of names) {
    if (typeof status[name] === "string" && status[name]) return status[name]
  }
  throw new Error(`Local Supabase status did not include any of: ${names.join(", ")}`)
}

function quote(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
}

const values = {
  AI_PROVIDER: "local",
  APP_BASE_URL: "http://127.0.0.1:3000",
  APP_ENVIRONMENT: "development",
  E2E_ADMIN_EMAIL: "browser.acceptance@example.test",
  E2E_ADMIN_PASSWORD: `E2E-${randomBytes(18).toString("base64url")}!aA1`,
  E2E_ALLOW_INITIAL_SETUP: "true",
  E2E_BASE_URL: "http://127.0.0.1:3000",
  GOOGLE_SIGN_IN_ENABLED: "false",
  INITIAL_ADMIN_SETUP_TOKEN: randomBytes(32).toString("hex"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: valueFor("PUBLISHABLE_KEY", "ANON_KEY"),
  NEXT_PUBLIC_SUPABASE_URL: valueFor("API_URL"),
  SUPABASE_SECRET_KEY: valueFor("SECRET_KEY", "SERVICE_ROLE_KEY"),
}

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, `${Object.entries(values).map(([key, value]) => `${key}=${quote(value)}`).join("\n")}\n`, {
  encoding: "utf8",
  mode: 0o600,
})
console.log(`Prepared ignored browser-acceptance environment at ${target}`)
