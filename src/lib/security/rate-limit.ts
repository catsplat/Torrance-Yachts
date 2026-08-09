import "server-only"

import { createHash } from "node:crypto"
import { headers } from "next/headers"

import { createAdminClient } from "@/lib/supabase/admin"

export async function consumeRateLimit(scope: string, maximum: number, windowSeconds: number, identity = "") {
  const requestHeaders = await headers()
  const trustProxy = process.env.TRUST_PROXY_HEADERS === "true"
  const forwarded = trustProxy
    ? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    : null
  const address = forwarded || (trustProxy ? requestHeaders.get("x-real-ip") : null) || "direct"
  const subject = createHash("sha256").update(`${scope}\0${address}\0${identity.toLowerCase()}`).digest("hex")
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_max_requests: maximum, p_scope: scope, p_subject_hash: subject, p_window_seconds: windowSeconds,
  })
  return !error && data === true
}
