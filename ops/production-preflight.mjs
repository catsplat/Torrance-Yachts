const required = [
  ["APP_DOMAIN", "private application hostname"],
  ["APP_IMAGE", "immutable GHCR application image"],
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

function value(name) {
  return process.env[name]?.trim() || ""
}

const failures = []
for (const [name, purpose] of required) {
  if (!present(name)) failures.push(`${name} - ${purpose}`)
}

const environment = process.env.APP_ENVIRONMENT?.trim() || "production"
if (!new Set(["staging", "production"]).has(environment)) {
  failures.push("APP_ENVIRONMENT - deployment packages support staging or production")
}

const image = value("APP_IMAGE")
const imageTag = image.match(/^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+:(staging|production)-(v\d+\.\d+\.\d+)$/)
const imageDigest = /^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+@sha256:[a-f0-9]{64}$/.test(image)
const declaredImageEnvironment = value("DEPLOYMENT_IMAGE_ENVIRONMENT")
if (!imageTag && !imageDigest) {
  failures.push("APP_IMAGE - use a lowercase GHCR staging-vX.Y.Z/production-vX.Y.Z tag or a verified sha256 digest")
} else if (imageTag && imageTag[1] !== environment) {
  failures.push("APP_IMAGE - image environment must match APP_ENVIRONMENT")
} else if (imageDigest && declaredImageEnvironment !== environment) {
  failures.push("DEPLOYMENT_IMAGE_ENVIRONMENT - a digest deployment must declare the environment verified by deploy-release.sh")
} else if (declaredImageEnvironment && declaredImageEnvironment !== environment) {
  failures.push("DEPLOYMENT_IMAGE_ENVIRONMENT - must match APP_ENVIRONMENT when present")
}

if (!/^(?:v)?\d+\.\d+\.\d+$/.test(value("DEPLOYMENT_VERSION"))) {
  failures.push("DEPLOYMENT_VERSION - use an immutable semantic release version")
}

const appDomain = value("APP_DOMAIN")
if (appDomain && (appDomain.includes("://") || appDomain.includes("/") || appDomain.includes(" "))) {
  failures.push("APP_DOMAIN - provide a hostname only, without a scheme, path, or spaces")
}

for (const name of [
  "AUTOMATION_SHARED_SECRET",
  "MONITORING_SHARED_SECRET",
  "N8N_ENCRYPTION_KEY",
  "TELEGRAM_WEBHOOK_SECRET",
]) {
  if (present(name) && value(name).length < 32) {
    failures.push(`${name} - use at least 32 characters`)
  }
}

const supabaseUrl = value("NEXT_PUBLIC_SUPABASE_URL")
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl)
    if (parsed.protocol !== "https:") {
      failures.push("NEXT_PUBLIC_SUPABASE_URL - deployed Supabase must use HTTPS")
    }
    if (environment === "production" && new Set(["127.0.0.1", "localhost"]).has(parsed.hostname)) {
      failures.push("NEXT_PUBLIC_SUPABASE_URL - production cannot use local Supabase")
    }
  } catch {
    failures.push("NEXT_PUBLIC_SUPABASE_URL - provide a valid URL")
  }
}

const aiProvider = process.env.AI_PROVIDER?.trim().toLowerCase() || "local"
if (!new Set(["local", "ollama", "openai"]).has(aiProvider)) {
  failures.push("AI_PROVIDER - must be local, ollama, or openai")
}
if (aiProvider === "openai" && !present("OPENAI_API_KEY")) {
  failures.push("OPENAI_API_KEY - required when AI_PROVIDER=openai")
}
if (aiProvider === "ollama" && environment === "production") {
  failures.push("AI_PROVIDER - hosted production cannot connect directly to an employee's local Ollama")
} else if (aiProvider === "ollama" && !present("OLLAMA_BASE_URL")) {
  failures.push("OLLAMA_BASE_URL - required for staging Ollama validation")
}

if (process.env.AUTH_SMTP_CONFIGURED !== "true") {
  failures.push("AUTH_SMTP_CONFIGURED - set true only after account email delivery is tested")
}

if (process.env.MFA_ENFORCEMENT_ENABLED === "false") {
  failures.push("MFA_ENFORCEMENT_ENABLED - production and staging must enforce MFA")
}

if (failures.length > 0) {
  console.error("Production preflight is not ready. Missing or incomplete operator configuration:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("Production configuration preflight passed. No secret values were printed.")
