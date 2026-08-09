const required = [
  ["APP_DOMAIN", "private application hostname"],
  ["CLOUDFLARE_TUNNEL_TOKEN", "outbound-only private application tunnel"],
  ["DEPLOYMENT_VERSION", "immutable release identifier"],
  ["NEXT_PUBLIC_SUPABASE_URL", "production Supabase URL"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Supabase publishable key"],
  ["SUPABASE_SECRET_KEY", "Supabase server secret"],
  ["AUTOMATION_SHARED_SECRET", "application-to-n8n delivery secret"],
  ["MONITORING_SHARED_SECRET", "readiness-monitor secret"],
  ["N8N_ENCRYPTION_KEY", "n8n credential encryption key"],
  ["GOOGLE_OAUTH_CLIENT_ID", "staff Google inbox OAuth application"],
  ["GOOGLE_OAUTH_CLIENT_SECRET", "staff Google inbox OAuth secret"],
  ["TELEGRAM_BOT_TOKEN", "company Telegram bot"],
  ["TELEGRAM_BOT_USERNAME", "Telegram pairing link"],
  ["TELEGRAM_WEBHOOK_SECRET", "Telegram webhook authentication"],
]

function present(name) {
  return Boolean(process.env[name]?.trim())
}

const failures = []
for (const [name, purpose] of required) {
  if (!present(name)) failures.push(`${name} — ${purpose}`)
}

const aiProvider = process.env.AI_PROVIDER?.trim().toLowerCase() || "local"
if (!new Set(["local", "ollama", "openai"]).has(aiProvider)) {
  failures.push("AI_PROVIDER — must be local, ollama, or openai")
}
if (aiProvider === "local") {
  failures.push("AI_PROVIDER — deterministic local rehearsal mode cannot be used for production")
}
if (aiProvider === "openai" && !present("OPENAI_API_KEY")) {
  failures.push("OPENAI_API_KEY — required when AI_PROVIDER=openai")
}
if (aiProvider === "ollama" && !present("OLLAMA_BASE_URL")) {
  failures.push("OLLAMA_BASE_URL — required when AI_PROVIDER=ollama")
}

if (process.env.AUTH_SMTP_CONFIGURED !== "true") {
  failures.push("AUTH_SMTP_CONFIGURED — set true only after account email delivery is tested")
}

if (failures.length > 0) {
  console.error("Production preflight is not ready. Missing or incomplete operator configuration:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("Production configuration preflight passed. No secret values were printed.")
