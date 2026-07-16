import "server-only"

import { timingSafeEqual } from "node:crypto"

export function hasValidMonitoringToken(request: Request) {
  const configured = process.env.MONITORING_SHARED_SECRET
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!configured || !supplied) return false
  const expectedBuffer = Buffer.from(configured)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
}
