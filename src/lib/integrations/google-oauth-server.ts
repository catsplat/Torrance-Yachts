import "server-only"

export type GoogleOAuthConfiguration =
  | { configured: false }
  | { clientId: string; clientSecret: string; configured: true }

export function getGoogleOAuthConfiguration(): GoogleOAuthConfiguration {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) return { configured: false }

  return { clientId, clientSecret, configured: true }
}
