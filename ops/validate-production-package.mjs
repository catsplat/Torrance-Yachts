import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

function syntheticEnvironmentFor(environment) {
  return {
    ...process.env,
    APP_DOMAIN: `${environment}.operations.example.test`,
    APP_ENVIRONMENT: environment,
    APP_IMAGE: `ghcr.io/catsplat/torrance-yachts:${environment}-v0.19.1`,
    DEPLOYMENT_IMAGE_ENVIRONMENT: environment,
    AUTH_SMTP_CONFIGURED: "true",
    AUTOMATION_SHARED_SECRET: "a".repeat(32),
    CLOUDFLARE_TUNNEL_TOKEN: "synthetic-cloudflare-tunnel-token",
    DEPLOYMENT_VERSION: "v0.19.1",
    GHCR_PULL_TOKEN: "synthetic-ghcr-read-token",
    GHCR_USERNAME: "torrance-deploy",
    GOOGLE_OAUTH_CLIENT_ID: "synthetic-google-client",
    GOOGLE_OAUTH_CLIENT_SECRET: "synthetic-google-secret",
    MONITORING_SHARED_SECRET: "m".repeat(32),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
    NEXT_PUBLIC_SUPABASE_URL: `https://${environment}.operations.example.test`,
    POSTGRES_PASSWORD: "synthetic-postgres-password",
    JWT_SECRET: "synthetic-jwt-secret-that-is-long-enough",
    ANON_KEY: "synthetic-anon-key",
    SERVICE_ROLE_KEY: "synthetic-service-role-key",
    S3_PROTOCOL_ACCESS_KEY_ID: "synthetic-storage-access",
    S3_PROTOCOL_ACCESS_KEY_SECRET: "synthetic-storage-secret",
    SMTP_ADMIN_EMAIL: "admin@example.test",
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_USER: "synthetic-smtp-user",
    SMTP_PASS: "synthetic-smtp-password",
    SMTP_SENDER_NAME: "Torrance Yachts",
    SUPABASE_SECRET_KEY: "synthetic-server-key",
    TELEGRAM_BOT_TOKEN: "synthetic-telegram-token",
    TELEGRAM_BOT_USERNAME: "synthetic_bot",
    TELEGRAM_WEBHOOK_SECRET: "t".repeat(32),
  }
}

function run(command, args, environment) {
  const result = spawnSync(command, args, { env: environment, shell: false, stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

for (const environment of ["staging", "production"]) {
  const syntheticEnvironment = syntheticEnvironmentFor(environment)
  run(process.execPath, ["ops/production-preflight.mjs"], syntheticEnvironment)
  run("docker", ["compose", "-f", "deploy/self-hosted-cx23/docker-compose.yml", "config", "--quiet"], syntheticEnvironment)
  run("docker", ["compose", "-f", "deploy/self-hosted-cx23/supabase-core.compose.yml", "config", "--quiet"], syntheticEnvironment)
}

const deployScript = readFileSync("ops/deploy-release.sh", "utf8")
const runtimeVerifier = readFileSync("ops/verify-hosted-runtime.sh", "utf8")
const deploymentWorkflow = readFileSync(".github/workflows/deploy.yml", "utf8")
const applicationCompose = readFileSync("deploy/self-hosted-cx23/docker-compose.yml", "utf8")
const coreCompose = readFileSync("deploy/self-hosted-cx23/supabase-core.compose.yml", "utf8")
const workflowSources = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/release-image.yml",
].map((path) => ({ path, source: readFileSync(path, "utf8") }))

for (const requiredContract of [
  "expected_revision=${3:-}",
  "org.opencontainers.image.revision",
  ".deployed-revision",
  "apply-selfhosted-migrations.sh apply",
  "GHCR_PULL_TOKEN is missing",
]) {
  if (!deployScript.includes(requiredContract)) {
    throw new Error(`Deployment script is missing the source-provenance contract: ${requiredContract}`)
  }
}

for (const requiredInvariant of [
  "Deployment .env must have mode 600",
  "unexpectedly has a host port",
  "APP_IMAGE is not an immutable registry digest",
  "apply-selfhosted-migrations.sh verify",
  "Hosted runtime invariants passed",
]) {
  if (!runtimeVerifier.includes(requiredInvariant)) {
    throw new Error(`Hosted runtime verifier is missing an expected invariant: ${requiredInvariant}`)
  }
}

for (const requiredService of ["app:", "worker:", "clamav:", "cloudflared:"]) {
  if (!applicationCompose.includes(requiredService)) throw new Error(`Application Compose is missing: ${requiredService}`)
}
for (const requiredService of ["db:", "auth:", "rest:", "storage:", "kong:"]) {
  if (!coreCompose.includes(requiredService)) throw new Error(`Supabase core Compose is missing: ${requiredService}`)
}
for (const forbidden of ["n8n:", "SUPABASE_DB_URL", "ports:"]) {
  if (applicationCompose.includes(forbidden) || coreCompose.includes(forbidden)) {
    throw new Error(`CX23 deployment Compose must not contain: ${forbidden}`)
  }
}

for (const requiredWorkflowStep of [
  "Record reviewed source revision",
  "apply-selfhosted-migrations.sh",
  "deploy/self-hosted-cx23/docker-compose.yml",
  "verify-hosted-runtime.sh",
  "Verify protected host runtime",
]) {
  if (!deploymentWorkflow.includes(requiredWorkflowStep)) {
    throw new Error(`Deployment workflow is missing the required integrity step: ${requiredWorkflowStep}`)
  }
}
for (const prohibitedWorkflowContract of ["SUPABASE_DB_URL", "supabase/setup-cli", "automation/workflows/01-core-scheduler.json"]) {
  if (deploymentWorkflow.includes(prohibitedWorkflowContract)) {
    throw new Error(`Deployment workflow must not expose the private host to: ${prohibitedWorkflowContract}`)
  }
}

for (const { path, source } of workflowSources) {
  const actionReferences = [...source.matchAll(/^\s*uses:\s+([^\s#]+)/gm)].map((match) => match[1])
  if (actionReferences.length === 0) throw new Error(`${path} does not reference any GitHub Actions.`)
  for (const actionReference of actionReferences) {
    if (!/@[a-f0-9]{40}$/i.test(actionReference)) {
      throw new Error(`${path} uses a mutable GitHub Action reference: ${actionReference}`)
    }
  }
}

const mismatchedEnvironment = syntheticEnvironmentFor("production")
mismatchedEnvironment.APP_IMAGE = "ghcr.io/catsplat/torrance-yachts:staging-v0.19.1"
const mismatch = spawnSync(process.execPath, ["ops/production-preflight.mjs"], {
  env: mismatchedEnvironment,
  encoding: "utf8",
  stdio: "pipe",
})
if (mismatch.status === 0) throw new Error("Production preflight accepted an image built for staging.")

console.log("CX23 deployment package contract is internally consistent.")
