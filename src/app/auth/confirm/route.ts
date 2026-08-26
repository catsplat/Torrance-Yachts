import { NextResponse } from "next/server"

import { failedAuthCallbackPath, safeAuthNextPath } from "@/lib/auth/callback-routing"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeAuthNextPath(url.searchParams.get("next"))
  // Legacy GET token redemption is intentionally disabled. Mail clients and
  // preview scanners fetch GET links, which can consume a token before the
  // intended recipient sees it. Manual links now use /auth/setup/:id and an
  // explicit CSRF-protected POST to redeem the server-held token.
  return NextResponse.redirect(new URL(failedAuthCallbackPath(next), url.origin))
}
