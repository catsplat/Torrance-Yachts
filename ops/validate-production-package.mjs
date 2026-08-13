import { spawnSync } from "node:child_process"

const syntheticEnvironment = {
  ...process.env,
  APP_DOMAIN: "operations.example.test",
  APP_ENVIRONMENT: "production",
  APP_IMAGE: "ghcr.io/catsplat/torrance-yachts:v0.19.1",
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

function run(command, args) {
  const result = spawnSync(command, args, {
    env: syntheticEnvironment,
    shell: false,
    stdio: "inherit",
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(process.execPath, ["ops/production-preflight.mjs"])
run("docker", ["compose", "-f", "deploy/production/docker-compose.yml", "config", "--quiet"])
console.log("Production package contract is internally consistent.")
