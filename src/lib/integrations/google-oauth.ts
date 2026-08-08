import { createHash, randomBytes } from "node:crypto"

export const googleWorkspaceScopes = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
] as const

export type PendingGoogleOAuthConnection = {
  codeVerifier: string
  state: string
  userId: string
}

export function getGoogleOAuthRedirectUri(applicationOrigin: string) {
  const origin = new URL(applicationOrigin).origin
  return new URL("/api/integrations/google/callback", origin).toString()
}

export function createGooglePkceConnection(userId: string): PendingGoogleOAuthConnection {
  return {
    codeVerifier: randomBytes(48).toString("base64url"),
    state: randomBytes(32).toString("base64url"),
    userId,
  }
}

export function createGoogleAuthorizationUrl({
  clientId,
  connection,
  redirectUri,
}: {
  clientId: string
  connection: PendingGoogleOAuthConnection
  redirectUri: string
}) {
  const codeChallenge = createHash("sha256")
    .update(connection.codeVerifier)
    .digest("base64url")
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("include_granted_scopes", "true")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", googleWorkspaceScopes.join(" "))
  url.searchParams.set("state", connection.state)
  return url
}

export function serialisePendingGoogleOAuthConnection(
  connection: PendingGoogleOAuthConnection,
) {
  return Buffer.from(JSON.stringify(connection)).toString("base64url")
}

export function parsePendingGoogleOAuthConnection(value: string | undefined) {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as PendingGoogleOAuthConnection).state !== "string" ||
      typeof (parsed as PendingGoogleOAuthConnection).codeVerifier !== "string" ||
      typeof (parsed as PendingGoogleOAuthConnection).userId !== "string"
    ) return null
    return parsed as PendingGoogleOAuthConnection
  } catch {
    return null
  }
}

export function isTrustedApplicationOrigin(origin: string) {
  try {
    const parsed = new URL(origin)
    return parsed.protocol === "https:" || parsed.hostname === "localhost"
  } catch {
    return false
  }
}
