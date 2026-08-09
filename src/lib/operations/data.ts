import "server-only"

import { cache } from "react"
import { z } from "zod"

import { getDocumentScannerHealth } from "@/lib/documents/scanner"
import { checkN8nHealth } from "@/lib/integrations/readiness"
import { createClient } from "@/lib/supabase/server"

const healthSchema = z.object({
  ai: z.object({
    claimed: z.coerce.number(),
    oldest_pending_at: z.string().nullable(),
    pending: z.coerce.number(),
    permanent_failure: z.coerce.number(),
  }),
  gmail: z.object({
    account_configured: z.boolean(),
    enabled: z.boolean(),
    lag_seconds: z.coerce.number().nullable(),
    last_error: z.string().nullable(),
    last_failure_at: z.string().nullable(),
    last_success_at: z.string().nullable(),
  }).nullable(),
  outbox: z.object({
    average_latency_ms: z.coerce.number().nullable(),
    claimed: z.coerce.number(),
    delivered_last_hour: z.coerce.number(),
    failed: z.coerce.number(),
    oldest_pending_at: z.string().nullable(),
    pending: z.coerce.number(),
  }),
  retention: z.object({ due: z.coerce.number() }),
  scanner: z.object({
    errors: z.coerce.number(),
    infected: z.coerce.number(),
    oldest_pending_at: z.string().nullable(),
    orphan_candidates: z.coerce.number(),
    pending: z.coerce.number(),
  }),
})

export const getOperationsWorkspace = cache(async () => {
  const supabase = await createClient()
  const [database, scanner, automation] = await Promise.all([
    supabase.rpc("get_operations_health"),
    getDocumentScannerHealth(),
    checkN8nHealth(),
  ])
  if (database.error) throw new Error("Operations health could not be loaded.")
  return { automation, database: healthSchema.parse(database.data), scanner }
})
