import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  createGoogleAuthorizationUrl,
  createGooglePkceConnection,
  getGoogleOAuthRedirectUri,
  isTrustedApplicationOrigin,
  serialisePendingGoogleOAuthConnection,
} from "@/lib/integrations/google-oauth"
import { getGoogleOAuthConfiguration } from "@/lib/integrations/google-oauth-server"
import { consumeRateLimit } from "@/lib/security/rate-limit"

const pendingConnectionCookie = "torrance_google_oauth_pending"

function settingsRedirect(request: NextRequest, notice: string) {
  const applicationOrigin = process.env.APP_BASE_URL?.trim() || request.nextUrl.origin
  const url = new URL("/settings/alerts", applicationOrigin)
  url.searchParams.set("google", notice)
  return url
}

export async function GET(request: NextRequest) {
  if (!await consumeRateLimit("google_oauth_connect", 10, 600)) {
    return NextResponse.redirect(settingsRedirect(request, "rate-limited"))
  }
  const context = await getAuthenticatedRequestContext()
  if (!context) return NextResponse.redirect(new URL("/login", request.url))

  const configuration = getGoogleOAuthConfiguration()
  if (!configuration.configured) {
    return NextResponse.redirect(settingsRedirect(request, "not-configured"))
  }

  const applicationOrigin = process.env.APP_BASE_URL?.trim() || request.nextUrl.origin
  if (!isTrustedApplicationOrigin(applicationOrigin)) {
    return NextResponse.redirect(settingsRedirect(request, "configuration-error"))
  }

  const connection = createGooglePkceConnection(context.userId)
  const authorizationUrl = createGoogleAuthorizationUrl({
    clientId: configuration.clientId,
    connection,
    redirectUri: getGoogleOAuthRedirectUri(applicationOrigin),
  })
  const response = NextResponse.redirect(authorizationUrl)
  response.cookies.set(pendingConnectionCookie, serialisePendingGoogleOAuthConnection(connection), {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/integrations/google",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  })
  return response
}
