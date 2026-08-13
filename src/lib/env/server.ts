import "server-only"

import { z } from "zod"

const deployedEnvironmentSchema = z.object({
  APP_BASE_URL: z.string().url(),
  APP_ENVIRONMENT: z.enum(["staging", "production"]),
  AUTOMATION_SHARED_SECRET: z.string().min(32),
  DEPLOYMENT_IMAGE_ENVIRONMENT: z.enum(["staging", "production"]),
  MFA_ENFORCEMENT_ENABLED: z.literal("true").optional().default("true"),
  MONITORING_SHARED_SECRET: z.string().min(32),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(16),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(16),
  TRUST_PROXY_HEADERS: z.literal("true"),
})

export function validateDeployedServerEnvironment(
  environment: Record<string, string | undefined> = process.env,
) {
  if (environment.APP_ENVIRONMENT !== "staging" && environment.APP_ENVIRONMENT !== "production") {
    return
  }
  const result = deployedEnvironmentSchema.safeParse(environment)
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))]
    throw new Error(`Deployed server configuration is invalid: ${fields.join(", ")}`)
  }
  const applicationUrl = new URL(result.data.APP_BASE_URL)
  const supabaseUrl = new URL(result.data.NEXT_PUBLIC_SUPABASE_URL)
  if (applicationUrl.protocol !== "https:") {
    throw new Error("Deployed server configuration is invalid: APP_BASE_URL must use HTTPS")
  }
  if (result.data.DEPLOYMENT_IMAGE_ENVIRONMENT !== result.data.APP_ENVIRONMENT) {
    throw new Error("Deployed server configuration is invalid: image environment does not match APP_ENVIRONMENT")
  }
  if (result.data.APP_ENVIRONMENT === "production" && supabaseUrl.hostname === "127.0.0.1") {
    throw new Error("Deployed server configuration is invalid: production cannot use local Supabase")
  }
}
