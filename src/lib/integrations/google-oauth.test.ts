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
    issuedAt: 1_000_000,
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
    expect(url.searchParams.get("scope")).toContain("spreadsheets")
    expect(url.searchParams.get("scope")).toContain("drive.metadata.readonly")
    expect(url.searchParams.get("scope")).toContain("calendar.events")
    expect(url.searchParams.get("scope")).toContain("drive.file")
  })

  it("round-trips only a well-formed pending connection", () => {
    expect(parsePendingGoogleOAuthConnection(serialisePendingGoogleOAuthConnection(connection), connection.issuedAt)).toEqual(connection)
    expect(parsePendingGoogleOAuthConnection("not-a-pending-connection")).toBeNull()
  })

  it("rejects expired, implausibly future, and legacy pending states", () => {
    const serialised = serialisePendingGoogleOAuthConnection(connection)
    expect(parsePendingGoogleOAuthConnection(serialised, connection.issuedAt + 10 * 60 * 1000 + 1)).toBeNull()
    expect(parsePendingGoogleOAuthConnection(serialised, connection.issuedAt - 30_001)).toBeNull()
    expect(parsePendingGoogleOAuthConnection(Buffer.from(JSON.stringify({
      codeVerifier: "verifier",
      state: "state-value",
      userId: connection.userId,
    })).toString("base64url"), connection.issuedAt)).toBeNull()
  })

  it("allows HTTPS and local development origins only", () => {
    expect(isTrustedApplicationOrigin("https://ops.torrance-yachts.test")).toBe(true)
    expect(isTrustedApplicationOrigin("http://localhost:3000")).toBe(true)
    expect(isTrustedApplicationOrigin("http://example.test")).toBe(false)
    expect(getGoogleOAuthRedirectUri("http://localhost:3000/anything")).toBe("http://localhost:3000/api/integrations/google/callback")
  })
})
