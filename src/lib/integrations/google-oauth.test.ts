import { describe, expect, it } from "vitest"

import {
  createGoogleAuthorizationUrl,
  getGoogleOAuthRedirectUri,
  isTrustedApplicationOrigin,
  parsePendingGoogleOAuthConnection,
  serialisePendingGoogleOAuthConnection,
} from "./google-oauth"

describe("Google OAuth setup helpers", () => {
  const connection = {
    codeVerifier: "verifier",
    state: "state-value",
    userId: "a9a7e0e6-9173-4f5e-bf70-e491b5127178",
  }

  it("creates a PKCE Google authorisation URL with the required scopes", () => {
    const url = createGoogleAuthorizationUrl({
      clientId: "client-id",
      connection,
      redirectUri: "http://localhost:3000/api/integrations/google/callback",
    })

    expect(url.origin).toBe("https://accounts.google.com")
    expect(url.searchParams.get("state")).toBe(connection.state)
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(url.searchParams.get("scope")).toContain("gmail.readonly")
    expect(url.searchParams.get("scope")).toContain("gmail.compose")
  })

  it("round-trips only a well-formed pending connection", () => {
    expect(parsePendingGoogleOAuthConnection(serialisePendingGoogleOAuthConnection(connection))).toEqual(connection)
    expect(parsePendingGoogleOAuthConnection("not-a-pending-connection")).toBeNull()
  })

  it("allows HTTPS and local development origins only", () => {
    expect(isTrustedApplicationOrigin("https://ops.torrance-yachts.test")).toBe(true)
    expect(isTrustedApplicationOrigin("http://localhost:3000")).toBe(true)
    expect(isTrustedApplicationOrigin("http://example.test")).toBe(false)
    expect(getGoogleOAuthRedirectUri("http://localhost:3000/anything")).toBe("http://localhost:3000/api/integrations/google/callback")
  })
})
