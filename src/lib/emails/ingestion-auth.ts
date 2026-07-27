import "server-only"

import { timingSafeEqual } from "node:crypto"

export function hasValidEmailIngestionToken(request: Request) {
  const configured = process.env.EMAIL_INGESTION_TOKEN
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!configured || !supplied) return false
  const expectedBuffer = Buffer.from(configured)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
}
