import { NextResponse } from "next/server"

import {
  failedAuthCallbackPath,
  hasApprovedInternalAccess,
  safeAuthNextPath,
} from "@/lib/auth/callback-routing"
import { createClient } from "@/lib/supabase/server"
import { consumeRateLimit } from "@/lib/security/rate-limit"

export async function GET(request: Request) {
  if (!await consumeRateLimit("oauth_callback", 20, 600)) {
    return NextResponse.redirect(new URL("/login?oauth=rate-limited", request.url))
  }
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeAuthNextPath(url.searchParams.get("next"))
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: userResult } = await supabase.auth.getUser()
      const { data: profile } = userResult.user
        ? await supabase
            .from("profiles")
            .select("access_approved_at, active")
            .eq("id", userResult.user.id)
            .maybeSingle()
        : { data: null }
      if (hasApprovedInternalAccess(profile)) {
        return NextResponse.redirect(new URL(next, url.origin))
      }
      return NextResponse.redirect(new URL("/access-pending", url.origin))
    }
  }
  return NextResponse.redirect(new URL(failedAuthCallbackPath(next), url.origin))
}
