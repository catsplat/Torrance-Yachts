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
  AI_PROVIDER: "local",
  CLOUDFLARE_TUNNEL_TOKEN: "synthetic-cloudflare-tunnel-token",
  DEPLOYMENT_VERSION: "v0.19.1",
  GOOGLE_OAUTH_CLIENT_ID: "synthetic-google-client",
  GOOGLE_OAUTH_CLIENT_SECRET: "synthetic-google-secret",
  MONITORING_SHARED_SECRET: "m".repeat(32),
  N8N_ENCRYPTION_KEY: "n".repeat(32),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "synthetic-secret-key",
  TELEGRAM_BOT_TOKEN: "synthetic-telegram-token",
  TELEGRAM_BOT_USERNAME: "synthetic_bot",
  TELEGRAM_WEBHOOK_SECRET: "t".repeat(32),
  }
}

function run(command, args, environment) {
  const result = spawnSync(command, args, {
    env: environment,
    shell: false,
    stdio: "inherit",
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

for (const environment of ["staging", "production"]) {
  const syntheticEnvironment = syntheticEnvironmentFor(environment)
  run(process.execPath, ["ops/production-preflight.mjs"], syntheticEnvironment)
  run("docker", ["compose", "-f", "deploy/production/docker-compose.yml", "config", "--quiet"], syntheticEnvironment)
}

const deployScript = readFileSync("ops/deploy-release.sh", "utf8")
const runtimeVerifier = readFileSync("ops/verify-hosted-runtime.sh", "utf8")
const deploymentWorkflow = readFileSync(".github/workflows/deploy.yml", "utf8")
const productionCompose = readFileSync("deploy/production/docker-compose.yml", "utf8")
const workflowSources = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/release-image.yml",
].map((path) => ({ path, source: readFileSync(path, "utf8") }))

for (const requiredContract of [
  "expected_revision=${3:-}",
  "org.opencontainers.image.revision",
  ".deployed-revision",
]) {
  if (!deployScript.includes(requiredContract)) {
    throw new Error(`Deployment script is missing the source-provenance contract: ${requiredContract}`)
  }
}

for (const requiredInvariant of [
  "Deployment .env must have mode 600",
  "unexpectedly has a host port",
  "APP_IMAGE is not an immutable registry digest",
  "Hosted runtime invariants passed",
]) {
  if (!runtimeVerifier.includes(requiredInvariant)) {
    throw new Error(`Hosted runtime verifier is missing an expected invariant: ${requiredInvariant}`)
  }
}

for (const pinnedRuntimeImage of [
  "clamav/clamav@sha256:",
  "docker.n8n.io/n8nio/n8n@sha256:",
  "cloudflare/cloudflared@sha256:",
]) {
  if (!productionCompose.includes(pinnedRuntimeImage)) {
    throw new Error(`Production Compose is missing the immutable runtime image pin: ${pinnedRuntimeImage}`)
  }
}

for (const requiredWorkflowStep of [
  "Record reviewed source revision",
  "verify-hosted-runtime.sh",
  "Verify protected host runtime",
]) {
  if (!deploymentWorkflow.includes(requiredWorkflowStep)) {
    throw new Error(`Deployment workflow is missing the required integrity step: ${requiredWorkflowStep}`)
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
if (mismatch.status === 0) {
  throw new Error("Production preflight accepted an image built for staging.")
}
console.log("Production package contract is internally consistent.")
