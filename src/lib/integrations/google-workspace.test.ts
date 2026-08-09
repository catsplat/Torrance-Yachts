import { describe, expect, it, vi } from "vitest"

import {
  listGoogleDriveFolders,
  listGoogleSpreadsheets,
  refreshGoogleAccessToken,
  type GoogleWorkspaceCredentials,
} from "./google-workspace"

const credentials: GoogleWorkspaceCredentials = {
  account_email: "workspace.admin@example.test",
  client_id: "synthetic-client-id",
  client_secret: "synthetic-client-secret",
  refresh_token: "synthetic-refresh-token",
  scopes: [
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
  ],
}

describe("Google Workspace resource selection", () => {
  it("refreshes an access token without exposing the refresh token in the URL", async () => {
    const request = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args
      return new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 })
    })
    await expect(refreshGoogleAccessToken(credentials, request)).resolves.toBe("access-token")
    expect(String(request.mock.calls[0][0])).toBe("https://oauth2.googleapis.com/token")
    expect(String(request.mock.calls[0][0])).not.toContain(credentials.refresh_token)
  })

  it("lists only spreadsheet metadata through the Drive API", async () => {
    let call = 0
    const request = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args
      call += 1
      return call === 1
        ? new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 })
        : new Response(JSON.stringify({ files: [{
          id: "sheet-1",
          modifiedTime: "2026-08-08T12:00:00Z",
          name: "Charter operations",
          webViewLink: "https://docs.google.com/spreadsheets/d/sheet-1/edit",
        }] }), { status: 200 })
    })

    await expect(listGoogleSpreadsheets(credentials, request)).resolves.toEqual([{
      id: "sheet-1",
      modifiedTime: "2026-08-08T12:00:00Z",
      name: "Charter operations",
      webViewLink: "https://docs.google.com/spreadsheets/d/sheet-1/edit",
    }])
    const url = new URL(String(request.mock.calls[1][0]))
    expect(url.origin).toBe("https://www.googleapis.com")
    expect(url.searchParams.get("q")).toContain("application/vnd.google-apps.spreadsheet")
    expect(request.mock.calls[1][1]?.headers).toEqual({ Authorization: "Bearer access-token" })
  })

  it("fails closed when Google returns malformed data", async () => {
    const request = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args
      return new Response(JSON.stringify({ access_token: "" }), { status: 200 })
    })
    await expect(refreshGoogleAccessToken(credentials, request)).rejects.toThrow("Reconnect Google Workspace")
  })

  it("lists only Drive folder metadata for administrator selection", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [{
        id: "folder-1",
        modifiedTime: "2026-08-08T12:00:00Z",
        name: "Charter documents",
        webViewLink: "https://drive.google.com/drive/folders/folder-1",
      }] }), { status: 200 }))
    await expect(listGoogleDriveFolders(credentials, request)).resolves.toEqual([{
      id: "folder-1",
      modifiedTime: "2026-08-08T12:00:00Z",
      name: "Charter documents",
      webViewLink: "https://drive.google.com/drive/folders/folder-1",
    }])
    const url = new URL(String(request.mock.calls[1]?.[0]))
    expect(url.searchParams.get("q")).toContain("application/vnd.google-apps.folder")
  })
})
