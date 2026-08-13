import { z } from "zod"

export const aiPreferencesSchema = z.object({
  enabled: z.boolean(),
  model: z.string().trim().max(128).regex(
    /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/,
    "Use a valid model identifier.",
  ).or(z.literal("")),
  provider: z.enum(["default", "local", "ollama", "openai"]),
  summaryStyle: z.enum(["concise", "detailed"]),
})

export const openAiCredentialSchema = z.object({
  apiKey: z.string().trim().min(16, "Enter the complete API key.").max(500),
})
