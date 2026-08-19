import { z } from "zod"
import { NextResponse } from "next/server"

import {
  emailAuthCallbackOrigin,
  failedAuthCallbackPath,
  hasApprovedInternalAccess,
} from "@/lib/auth/callback-routing"
import { consumeRateLimit } from "@/lib/security/rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { createRouteClient } from "@/lib/supabase/route"

type Props = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Props) {
  const { id } = await params
  const linkId = z.uuid().safeParse(id)
  const origin = emailAuthCallbackOrigin(new URL(request.url).origin, request.headers.get("host"))
  const suppliedOrigin = request.headers.get("origin")
  if (!linkId.success || suppliedOrigin !== origin || !await consumeRateLimit("manual_auth_setup", 12, 600)) {
    return NextResponse.redirect(new URL("/login?recovery=invalid", origin))
  }

  const admin = createAdminClient()
  const { data: claimed, error: claimError } = await admin.rpc("claim_manual_auth_link", {
    p_link_id: linkId.data,
  })
  const handoff = claimed?.[0]
  if (claimError || !handoff || (handoff.purpose !== "invite" && handoff.purpose !== "recovery")) {
    return NextResponse.redirect(new URL("/login?recovery=invalid", origin))
  }

  const auth = await createRouteClient()
  const { error } = await auth.supabase.auth.verifyOtp({
    token_hash: handoff.token_hash,
    type: handoff.purpose,
  })
  await admin.rpc("finish_manual_auth_link", { p_link_id: linkId.data, p_succeeded: !error })
  if (error) return NextResponse.redirect(new URL(failedAuthCallbackPath("/account/update-password"), origin))

  const { data: userResult } = await auth.supabase.auth.getUser()
  const { data: profile } = userResult.user
    ? await auth.supabase.from("profiles").select("access_approved_at, active").eq("id", userResult.user.id).maybeSingle()
    : { data: null }
  if (!hasApprovedInternalAccess(profile)) return auth.redirect(new URL("/access-pending", origin))
  return auth.redirect(new URL("/account/update-password", origin))
}
