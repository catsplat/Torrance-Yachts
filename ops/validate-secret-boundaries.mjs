import { readFileSync } from "node:fs"
import { globSync } from "node:fs"

const forbidden = [
  "SUPABASE_SECRET_KEY",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "OPENAI_API_KEY",
  "OLLAMA_API_KEY",
  "AUTOMATION_SHARED_SECRET",
  "MONITORING_SHARED_SECRET",
]

const violations = []
const sourceFiles = ["js", "jsx", "ts", "tsx"].flatMap((extension) =>
  globSync(`src/**/*.${extension}`),
)
for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8")
  const firstStatement = source.replace(/^\uFEFF/, "").trimStart().split(/\r?\n/, 1)[0]
  if (firstStatement !== '"use client"' && firstStatement !== "'use client'") continue
  for (const secret of forbidden) {
    if (source.includes(secret)) violations.push(`${file}: references ${secret}`)
  }
  for (const serverModule of [
    "@/lib/supabase/admin",
    "@/lib/ai/config",
    "@/lib/integrations/google-oauth-server",
  ]) {
    if (source.includes(serverModule)) violations.push(`${file}: imports ${serverModule}`)
  }
}

if (violations.length) {
  console.error("Client/server secret boundary violations:")
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}
console.log("Client components do not reference privileged server configuration.")
