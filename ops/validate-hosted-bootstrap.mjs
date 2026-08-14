import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"

function assert(condition, message) {
  if (!condition) throw new Error(`Hosted bootstrap validation failed: ${message}`)
}

const source = readFileSync("ops/provision-hosted-vps.sh", "utf8")
const handoff = readFileSync("docs/operations/HOSTED_ACTIVATION_HANDOFF.md", "utf8")
const selfHostedEnvironmentExample = readFileSync("deploy/self-hosted-cx23/.env.example", "utf8")
const preflight = readFileSync("ops/production-preflight.mjs", "utf8")
const deploymentWorkflow = readFileSync(".github/workflows/deploy.yml", "utf8")

const syntax = spawnSync("bash", ["-n", "ops/provision-hosted-vps.sh"], { encoding: "utf8" })
assert(syntax.status === 0, syntax.stderr || "bootstrap script has invalid shell syntax")

for (const contract of [
  "set -Eeuo pipefail",
  "This reviewed bootstrap currently supports Ubuntu only.",
  "docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
  "systemctl enable --now docker",
  "usermod -aG docker",
  "install -m 0600",
  "No application image, Cloudflare tunnel, database, credentials, ports or business data were configured.",
]) {
  assert(source.includes(contract), `bootstrap script is missing: ${contract}`)
}

for (const name of [
  "APP_DOMAIN",
  "CLOUDFLARE_TUNNEL_TOKEN",
  "SUPABASE_SECRET_KEY",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "TELEGRAM_BOT_TOKEN",
]) {
  assert(handoff.includes(name), `handoff does not explain ${name}`)
}

for (const requiredEnvironmentName of [
  "APP_DOMAIN",
  "APP_IMAGE",
  "BACKUP_DIRECTORY",
  "BACKUP_ENCRYPTION_RECIPIENT",
  "BACKUP_RCLONE_REMOTE",
  "CLOUDFLARE_TUNNEL_TOKEN",
  "GHCR_USERNAME",
  "GHCR_PULL_TOKEN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "AUTOMATION_SHARED_SECRET",
  "MONITORING_SHARED_SECRET",
  "TELEGRAM_BOT_TOKEN",
]) {
  assert(selfHostedEnvironmentExample.includes(`${requiredEnvironmentName}=`), `self-hosted .env.example is missing ${requiredEnvironmentName}`)
}

for (const requiredPreflightName of ["APP_DOMAIN", "APP_IMAGE", "CLOUDFLARE_TUNNEL_TOKEN", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"]) {
  assert(preflight.includes(`"${requiredPreflightName}"`), `preflight does not require ${requiredPreflightName}`)
}

for (const requiredSelfHostedName of ["POSTGRES_PASSWORD", "JWT_SECRET", "ANON_KEY", "SERVICE_ROLE_KEY", "SMTP_HOST"]) {
  assert(selfHostedEnvironmentExample.includes(`${requiredSelfHostedName}=`), `self-hosted .env.example is missing ${requiredSelfHostedName}`)
  assert(handoff.includes(requiredSelfHostedName), `handoff does not explain ${requiredSelfHostedName}`)
}

for (const expectedDeploymentContract of [
  "deploy/self-hosted-cx23/docker-compose.yml",
  "apply-selfhosted-migrations.sh",
  "migrations.next",
]) {
  assert(deploymentWorkflow.includes(expectedDeploymentContract), `deployment workflow is missing ${expectedDeploymentContract}`)
}
for (const prohibitedDeploymentContract of ["SUPABASE_DB_URL", "supabase/setup-cli", "automation/workflows/01-core-scheduler.json"]) {
  assert(!deploymentWorkflow.includes(prohibitedDeploymentContract), `deployment workflow must not reference ${prohibitedDeploymentContract}`)
}

console.log("Hosted VPS bootstrap and activation handoff contracts are internally consistent.")
