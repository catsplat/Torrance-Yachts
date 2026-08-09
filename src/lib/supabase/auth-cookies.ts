export function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && (
    name.includes("-auth-token") || name.endsWith("-code-verifier")
  )
}
