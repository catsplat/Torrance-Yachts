import { spawnSync } from "node:child_process"

const syntheticEnvironment = {
  ...process.env,
  APP_DOMAIN: "operations.example.test",
  AUTH_SMTP_CONFIGURED: "true",
  AUTOMATION_SHARED_SECRET: "synthetic-automation-secret",
  AI_PROVIDER: "openai",
  CLOUDFLARE_TUNNEL_TOKEN: "synthetic-cloudflare-tunnel-token",
  DEPLOYMENT_VERSION: "verification",
  GOOGLE_OAUTH_CLIENT_ID: "synthetic-google-client",
  GOOGLE_OAUTH_CLIENT_SECRET: "synthetic-google-secret",
  MONITORING_SHARED_SECRET: "synthetic-monitoring-secret",
  N8N_ENCRYPTION_KEY: "synthetic-n8n-encryption-key",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  OPENAI_API_KEY: "synthetic-openai-key",
  SUPABASE_SECRET_KEY: "synthetic-secret-key",
  TELEGRAM_BOT_TOKEN: "synthetic-telegram-token",
  TELEGRAM_BOT_USERNAME: "synthetic_bot",
  TELEGRAM_WEBHOOK_SECRET: "synthetic-telegram-webhook-secret",
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
