import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const environment = {
  ...process.env,
  APP_DOMAIN: "operations.example.test",
  APP_ENVIRONMENT: "production",
  APP_IMAGE: "ghcr.io/catsplat/torrance-yachts@sha256:" + "a".repeat(64),
  AUTH_SMTP_CONFIGURED: "true",
  AUTOMATION_SHARED_SECRET: "a".repeat(32),
  CLOUDFLARE_TUNNEL_TOKEN: "synthetic-cloudflare-token",
  DEPLOYMENT_IMAGE_ENVIRONMENT: "production",
  DEPLOYMENT_VERSION: "v0.19.1",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://operations.example.test",
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
  PG_META_CRYPTO_KEY: "synthetic-meta-crypto-key",
  MONITORING_SHARED_SECRET: "m".repeat(32),
}

const result = spawnSync("docker", ["compose", "-f", "deploy/self-hosted-cx23/docker-compose.yml", "config", "--quiet"], {
  env: environment,
  stdio: "inherit",
})
if (result.status !== 0) process.exit(result.status ?? 1)

const coreResult = spawnSync("docker", ["compose", "-f", "deploy/self-hosted-cx23/supabase-core.compose.yml", "config", "--quiet"], {
  env: environment,
  stdio: "inherit",
})
if (coreResult.status !== 0) process.exit(coreResult.status ?? 1)

const compose = readFileSync("deploy/self-hosted-cx23/docker-compose.yml", "utf8")
const gateway = readFileSync("deploy/self-hosted-cx23/Caddyfile", "utf8")
const tailscalePilot = readFileSync("deploy/self-hosted-cx23/docker-compose.tailscale-pilot.yml", "utf8")
const supabaseCore = readFileSync("deploy/self-hosted-cx23/supabase-core.compose.yml", "utf8")
const worker = readFileSync("ops/automation-worker.mjs", "utf8")
const bootstrap = readFileSync("ops/bootstrap-selfhosted-supabase.sh", "utf8")
const migrationRunner = readFileSync("ops/apply-selfhosted-migrations.sh", "utf8")
const stagingReset = readFileSync("ops/reset-temporal-staging.sh", "utf8")
const stagingRestore = readFileSync("ops/backup/restore-to-temporal-staging.sh", "utf8")
const backupScheduleInstaller = readFileSync("ops/install-backup-schedule.sh", "utf8")
const backupService = readFileSync("deploy/systemd/torrance-yachts-backup.service.template", "utf8")
const backupTimer = readFileSync("deploy/systemd/torrance-yachts-backup.timer", "utf8")
for (const required of ["gateway:", "app:", "worker:", "clamav:", "cloudflared:", "SUPABASE_INTERNAL_URL: http://kong:8000", "external: true", "torrance-internal"]) {
  if (!compose.includes(required)) throw new Error(`CX23 Compose package is missing: ${required}`)
}
for (const memoryContract of ["mem_limit: 384m", "mem_limit: 96m", "mem_limit: 2048m", "mem_limit: 64m"]) {
  if (!compose.includes(memoryContract)) throw new Error(`CX23 application memory profile is missing: ${memoryContract}`)
}
for (const forbidden of ["n8n:", "ports:", "studio:", "realtime:"]) {
  if (compose.includes(forbidden)) throw new Error(`CX23 Compose package must not contain: ${forbidden}`)
}
for (const required of ["auto_https off", "/auth/v1/*", "/rest/v1/*", "kong:8000", "app:3000"]) {
  if (!gateway.includes(required)) throw new Error(`Private gateway is missing: ${required}`)
}
for (const required of ["127.0.0.1:3000:8080", "gateway:"]) {
  if (!tailscalePilot.includes(required)) throw new Error(`Tailscale pilot override is missing: ${required}`)
}
for (const required of ["db:", "auth:", "rest:", "storage:", "kong:", "meta:", "studio:", "profiles: [\"studio\"]", "127.0.0.1:54323:3000", "ENABLE_IMAGE_TRANSFORMATION: \"false\"", "torrance-internal"]) {
  if (!supabaseCore.includes(required)) throw new Error(`Self-hosted Supabase core is missing: ${required}`)
}
for (const memoryContract of ["mem_limit: 896m", "mem_limit: 192m", "mem_limit: 128m", "mem_limit: 256m"]) {
  if (!supabaseCore.includes(memoryContract)) throw new Error(`CX23 Supabase memory profile is missing: ${memoryContract}`)
}
for (const forbidden of ["realtime:", "imgproxy:", "functions:", "supavisor:"]) {
  if (supabaseCore.includes(forbidden)) throw new Error(`Self-hosted Supabase core must not contain: ${forbidden}`)
}
for (const required of ["dispatch-alerts", "dispatch-google-workspace", "AUTOMATION_SHARED_SECRET", "cycle_completed"]) {
  if (!worker.includes(required)) throw new Error(`Automation worker is missing: ${required}`)
}
for (const required of ["86854671e95be31e24fa0785cded0579fe692fcb", "--depth 1", "self-hosted-cx23.env.example", "Run as the non-root deployment user"]) {
  if (!bootstrap.includes(required)) throw new Error(`Pinned Supabase bootstrap is missing: ${required}`)
}
for (const required of [
  "supabase_migrations.schema_migrations",
  "Self-hosted migration $mode completed",
  "core_compose exec -T db psql",
  "apply|verify",
]) {
  if (!migrationRunner.includes(required)) throw new Error(`Self-hosted migration runner is missing: ${required}`)
}
for (const required of ["DESTROY_SYNTHETIC_STAGING", "APP_ENVIRONMENT is not staging", "staging.*", "core_compose down --volumes"]) {
  if (!stagingReset.includes(required)) throw new Error(`Temporal staging reset is missing: ${required}`)
}
for (const required of ["RESTORE_SYNTHETIC_STAGING", "APP_ENVIRONMENT is not staging", "drop schema if exists public cascade", "Synthetic staging restore completed"]) {
  if (!stagingRestore.includes(required)) throw new Error(`Temporal staging restore is missing: ${required}`)
}
for (const required of ["BACKUP_ENCRYPTION_RECIPIENT", "BACKUP_RCLONE_REMOTE", "systemctl enable --now torrance-yachts-backup.timer"]) {
  if (!backupScheduleInstaller.includes(required)) throw new Error(`Backup scheduler installer is missing: ${required}`)
}
for (const required of ["ExecStart=/usr/bin/flock", "NoNewPrivileges=true", "ProtectSystem=full", "UMask=0077"]) {
  if (!backupService.includes(required)) throw new Error(`Backup service hardening is missing: ${required}`)
}
for (const required of ["OnCalendar=*-*-* 03:17:00 UTC", "Persistent=true", "RandomizedDelaySec=20m"]) {
  if (!backupTimer.includes(required)) throw new Error(`Backup timer schedule is missing: ${required}`)
}
console.log("Self-hosted CX23 package contract is internally consistent.")
