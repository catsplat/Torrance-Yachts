import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  getGoogleOAuthRedirectUri,
  isTrustedApplicationOrigin,
  parsePendingGoogleOAuthConnection,
} from "@/lib/integrations/google-oauth"
import { getGoogleOAuthConfiguration } from "@/lib/integrations/google-oauth-server"
import { consumeRateLimit } from "@/lib/security/rate-limit"

const pendingConnectionCookie = "torrance_google_oauth_pending"

const googleTokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
})

const googleUserInfoSchema = z.object({
  email: z.email(),
  email_verified: z.boolean().optional(),
})

function settingsRedirect(request: NextRequest, notice: string) {
  const applicationOrigin = process.env.APP_BASE_URL?.trim() || request.nextUrl.origin
  const url = new URL("/settings/alerts", applicationOrigin)
  url.searchParams.set("google", notice)
  return url
}

function completeRedirect(request: NextRequest, notice: string) {
  const response = NextResponse.redirect(settingsRedirect(request, notice))
  response.cookies.set(pendingConnectionCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/integrations/google",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  })
  return response
}

export async function GET(request: NextRequest) {
  if (!await consumeRateLimit("google_oauth_callback", 20, 600)) {
    return completeRedirect(request, "rate-limited")
  }
  const providerError = request.nextUrl.searchParams.get("error")
  if (providerError) return completeRedirect(request, "declined")

  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const pending = parsePendingGoogleOAuthConnection(request.cookies.get(pendingConnectionCookie)?.value)
  const context = await getAuthenticatedRequestContext()
  if (!code || !state || !pending || !context || pending.state !== state || pending.userId !== context.userId) {
    return completeRedirect(request, "invalid-state")
  }

  const configuration = getGoogleOAuthConfiguration()
  const applicationOrigin = process.env.APP_BASE_URL?.trim() || request.nextUrl.origin
  if (!configuration.configured || !isTrustedApplicationOrigin(applicationOrigin)) {
    return completeRedirect(request, "configuration-error")
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      code,
      code_verifier: pending.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: getGoogleOAuthRedirectUri(applicationOrigin),
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  if (!tokenResponse?.ok) return completeRedirect(request, "token-error")

  const tokens = googleTokenSchema.safeParse(await tokenResponse.json().catch(() => null))
  if (!tokens.success || !tokens.data.refresh_token) {
    return completeRedirect(request, "refresh-token-missing")
  }

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokens.data.access_token}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  const userInfo = googleUserInfoSchema.safeParse(await userInfoResponse?.json().catch(() => null))
  if (!userInfoResponse?.ok || !userInfo.success || userInfo.data.email_verified === false) {
    return completeRedirect(request, "account-error")
  }

  const { error } = await context.supabase.rpc("save_my_gmail_oauth_credentials", {
    p_account_email: userInfo.data.email,
    p_client_id: configuration.clientId,
    p_client_secret: configuration.clientSecret,
    p_reason: "Google inbox connected through secure consent flow",
    p_refresh_token: tokens.data.refresh_token,
    p_scopes: (tokens.data.scope ?? "").split(/\s+/).filter(Boolean),
  })
  if (error) return completeRedirect(request, "save-error")

  return completeRedirect(request, "connected")
}
