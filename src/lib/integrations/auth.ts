import "server-only"

import { timingSafeEqual } from "node:crypto"

export function hasValidAutomationToken(request: Request) {
  const configured = process.env.AUTOMATION_SHARED_SECRET
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!configured || !supplied) return false
  const expectedBuffer = Buffer.from(configured)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
}
