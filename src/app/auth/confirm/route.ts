import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import {
  emailAuthCallbackOrigin,
  failedAuthCallbackPath,
  hasApprovedInternalAccess,
  safeAuthNextPath,
} from "@/lib/auth/callback-routing"
import { consumeRateLimit } from "@/lib/security/rate-limit"
import { createRouteClient } from "@/lib/supabase/route"

type SupportedEmailConfirmationType = Extract<EmailOtpType, "invite" | "recovery">

function isSupportedEmailConfirmationType(value: string | null): value is SupportedEmailConfirmationType {
  return value === "invite" || value === "recovery"
}

export async function GET(request: Request) {
  if (!await consumeRateLimit("email_auth_confirmation", 20, 600)) {
    return NextResponse.redirect(new URL("/login?oauth=rate-limited", request.url))
  }

  const url = new URL(request.url)
  const callbackOrigin = emailAuthCallbackOrigin(url.origin, request.headers.get("host"))
  const next = safeAuthNextPath(url.searchParams.get("next"))
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")

  if (!tokenHash || !isSupportedEmailConfirmationType(type)) {
    return NextResponse.redirect(new URL(failedAuthCallbackPath(next), callbackOrigin))
  }

  const auth = await createRouteClient()
  const { error } = await auth.supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })
  if (error) return NextResponse.redirect(new URL(failedAuthCallbackPath(next), callbackOrigin))

  const { data: userResult } = await auth.supabase.auth.getUser()
  const { data: profile } = userResult.user
    ? await auth.supabase
        .from("profiles")
        .select("access_approved_at, active")
        .eq("id", userResult.user.id)
        .maybeSingle()
    : { data: null }

  if (!hasApprovedInternalAccess(profile)) {
    return auth.redirect(new URL("/access-pending", callbackOrigin))
  }

  return auth.redirect(new URL(next, callbackOrigin))
}
