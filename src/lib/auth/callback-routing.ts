export function safeAuthNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/"
}

export function failedAuthCallbackPath(nextPath: string) {
  return nextPath.startsWith("/account/update-password")
    ? "/login?recovery=invalid"
    : "/login?oauth=failed"
}

