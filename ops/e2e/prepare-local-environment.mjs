import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

import { createClient } from "@supabase/supabase-js"

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

const adminPassword = `E2E-${randomBytes(18).toString("base64url")}!aA1`
const staffPassword = `E2E-${randomBytes(18).toString("base64url")}!aA1`
const values = {
  AI_PROVIDER: "local",
  APP_BASE_URL: "http://127.0.0.1:3000",
  APP_ENVIRONMENT: "development",
  E2E_ADMIN_EMAIL: "browser.acceptance@example.test",
  E2E_ADMIN_PASSWORD: adminPassword,
  E2E_STAFF_EMAIL: "browser.staff@example.test",
  E2E_STAFF_PASSWORD: staffPassword,
  E2E_ALLOW_INITIAL_SETUP: "false",
  E2E_BASE_URL: "http://127.0.0.1:3000",
  GOOGLE_SIGN_IN_ENABLED: "false",
  INITIAL_ADMIN_SETUP_TOKEN: randomBytes(32).toString("hex"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: valueFor("PUBLISHABLE_KEY", "ANON_KEY"),
  NEXT_PUBLIC_SUPABASE_URL: valueFor("API_URL"),
  MFA_ENFORCEMENT_ENABLED: "true",
  SUPABASE_SECRET_KEY: valueFor("SERVICE_ROLE_KEY", "SECRET_KEY"),
}

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, `${Object.entries(values).map(([key, value]) => `${key}=${quote(value)}`).join("\n")}\n`, {
  encoding: "utf8",
  mode: 0o600,
})

const admin = createClient(values.NEXT_PUBLIC_SUPABASE_URL, values.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (existing.error) throw new Error("Browser-acceptance users could not be inspected.")
const previous = existing.data.users.find((candidate) => candidate.email === values.E2E_ADMIN_EMAIL)
const created = previous
  ? await admin.auth.admin.updateUserById(previous.id, {
      email_confirm: true,
      password: adminPassword,
      user_metadata: { display_name: "Browser Acceptance Administrator" },
    })
  : await admin.auth.admin.createUser({
      email: values.E2E_ADMIN_EMAIL,
      email_confirm: true,
      password: adminPassword,
      user_metadata: { display_name: "Browser Acceptance Administrator" },
    })
if (created.error || !created.data.user) throw new Error("The browser-acceptance administrator could not be prepared.")
const factors = await admin.auth.admin.mfa.listFactors({ userId: created.data.user.id })
if (factors.error) throw new Error("Browser-acceptance MFA factors could not be inspected.")
for (const factor of factors.data.factors) {
  const removed = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: created.data.user.id })
  if (removed.error) throw new Error("A stale browser-acceptance MFA factor could not be removed.")
}
const approved = await admin.rpc("prepare_synthetic_acceptance_administrator", {
  p_user_id: created.data.user.id,
})
if (approved.error) throw new Error(`The browser-acceptance administrator could not be approved: ${approved.error.message}`)

const previousStaff = existing.data.users.find((candidate) => candidate.email === values.E2E_STAFF_EMAIL)
const createdStaff = previousStaff
  ? await admin.auth.admin.updateUserById(previousStaff.id, {
      email_confirm: true,
      password: staffPassword,
      user_metadata: { display_name: "Browser Acceptance Staff" },
    })
  : await admin.auth.admin.createUser({
      email: values.E2E_STAFF_EMAIL,
      email_confirm: true,
      password: staffPassword,
      user_metadata: { display_name: "Browser Acceptance Staff" },
    })
if (createdStaff.error || !createdStaff.data.user) throw new Error("The browser-acceptance staff account could not be prepared.")
const staffFactors = await admin.auth.admin.mfa.listFactors({ userId: createdStaff.data.user.id })
if (staffFactors.error) throw new Error("Browser-acceptance staff MFA factors could not be inspected.")
for (const factor of staffFactors.data.factors) {
  const removed = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: createdStaff.data.user.id })
  if (removed.error) throw new Error("A stale browser-acceptance staff MFA factor could not be removed.")
}
const approvedStaff = await admin.rpc("prepare_synthetic_acceptance_staff", {
  p_user_id: createdStaff.data.user.id,
})
if (approvedStaff.error) throw new Error(`The browser-acceptance staff account could not be approved: ${approvedStaff.error.message}`)
console.log(`Prepared ignored browser-acceptance environment at ${target}`)
