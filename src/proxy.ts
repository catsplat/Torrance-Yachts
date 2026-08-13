import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

function buildContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development"
  const isProductionDeployment = process.env.APP_ENVIRONMENT === "production"
  const supabaseOrigin = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin
    } catch {
      return ""
    }
  })()
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: ${supabaseOrigin};
    font-src 'self';
    connect-src 'self' ${supabaseOrigin};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    worker-src 'self' blob:;
    manifest-src 'self';
    ${isProductionDeployment ? "upgrade-insecure-requests;" : ""}
  `.replace(/\s{2,}/g, " ").trim()
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)

  const trustedApi =
    request.nextUrl.pathname.startsWith("/api/integrations/") ||
    request.nextUrl.pathname.startsWith("/api/health/")
  const publicAuthCallback = request.nextUrl.pathname === "/auth/callback" || request.nextUrl.pathname === "/auth/confirm"
  const publicInitialSetup = request.nextUrl.pathname === "/setup"
  const response = trustedApi || publicAuthCallback || publicInitialSetup
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : await updateSession(request, requestHeaders)
  response.headers.set("Content-Security-Policy", contentSecurityPolicy)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "private, no-store")
  }
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
