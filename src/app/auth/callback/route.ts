import { NextResponse } from "next/server"

import {
  emailAuthCallbackOrigin,
  failedAuthCallbackPath,
  hasApprovedInternalAccess,
  safeAuthNextPath,
} from "@/lib/auth/callback-routing"
import { consumeRateLimit } from "@/lib/security/rate-limit"
import { createRouteClient } from "@/lib/supabase/route"

export async function GET(request: Request) {
  if (!await consumeRateLimit("oauth_callback", 20, 600)) {
    return NextResponse.redirect(new URL("/login?oauth=rate-limited", request.url))
  }
  const url = new URL(request.url)
  const callbackOrigin = emailAuthCallbackOrigin(url.origin, request.headers.get("host"))
  const code = url.searchParams.get("code")
  const next = safeAuthNextPath(url.searchParams.get("next"))
  if (code) {
    const auth = await createRouteClient()
    const { error } = await auth.supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: userResult } = await auth.supabase.auth.getUser()
      const { data: profile } = userResult.user
        ? await auth.supabase
            .from("profiles")
            .select("access_approved_at, active")
            .eq("id", userResult.user.id)
            .maybeSingle()
        : { data: null }
      if (hasApprovedInternalAccess(profile)) {
        return auth.redirect(new URL(next, callbackOrigin))
      }
      return auth.redirect(new URL("/access-pending", callbackOrigin))
    }
  }
  return NextResponse.redirect(new URL(failedAuthCallbackPath(next), callbackOrigin))
}
