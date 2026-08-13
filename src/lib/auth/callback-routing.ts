export function safeAuthNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/"
}

/**
 * Supabase Auth email links must keep their session cookie on the same origin
 * through confirmation and password setup. Production accepts only the
 * configured application origin. Development additionally permits the two
 * loopback aliases used by the local Supabase and Playwright stacks.
 */
export function emailAuthCallbackOrigin(
  requestOrigin: string,
  requestHost: string | null,
  applicationBaseUrl = process.env.APP_BASE_URL,
  isProduction = process.env.NODE_ENV === "production",
) {
  const configuredOrigin = new URL(applicationBaseUrl?.trim() || requestOrigin).origin
  const configured = new URL(configuredOrigin)
  const host = requestHost?.trim().toLowerCase()

  if (host === configured.host.toLowerCase()) return configuredOrigin
  if (!isProduction && (host === "localhost:3000" || host === "127.0.0.1:3000")) {
    return `${configured.protocol}//${host}`
  }
  return configuredOrigin
}

export function failedAuthCallbackPath(nextPath: string) {
  return nextPath.startsWith("/account/update-password")
    ? "/login?recovery=invalid"
    : "/login?oauth=failed"
}

export function hasApprovedInternalAccess(
  profile: { access_approved_at: string | null; active: boolean } | null,
) {
  return Boolean(profile?.active && profile.access_approved_at)
}
