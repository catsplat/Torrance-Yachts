export function safeAuthNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/"
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
