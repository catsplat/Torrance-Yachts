import { z } from "zod"

type FetchImplementation = typeof fetch

export type GoogleWorkspaceCredentials = {
  account_email: string
  client_id: string
  client_secret: string
  refresh_token: string
  scopes: string[]
}

export type GoogleSpreadsheet = {
  id: string
  modifiedTime: string | null
  name: string
  webViewLink: string | null
}

const accessTokenSchema = z.object({
  access_token: z.string().min(1),
})

const spreadsheetListSchema = z.object({
  files: z.array(z.object({
    id: z.string().min(1).max(500),
    modifiedTime: z.iso.datetime().nullable().optional(),
    name: z.string().min(1).max(500),
    webViewLink: z.url().nullable().optional(),
  })).max(100).default([]),
})

export async function refreshGoogleAccessToken(
  credentials: GoogleWorkspaceCredentials,
  request: FetchImplementation = fetch,
) {
  const response = await request("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      grant_type: "refresh_token",
      refresh_token: credentials.refresh_token,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
    signal: AbortSignal.timeout(8_000),
  })
  const parsed = accessTokenSchema.safeParse(await response.json().catch(() => null))
  if (!response.ok || !parsed.success) throw new Error("Reconnect Google Workspace.")
  return parsed.data.access_token
}

export async function listGoogleSpreadsheets(
  credentials: GoogleWorkspaceCredentials,
  request: FetchImplementation = fetch,
): Promise<GoogleSpreadsheet[]> {
  const accessToken = await refreshGoogleAccessToken(credentials, request)
  const url = new URL("https://www.googleapis.com/drive/v3/files")
  url.searchParams.set("fields", "files(id,name,modifiedTime,webViewLink)")
  url.searchParams.set("includeItemsFromAllDrives", "true")
  url.searchParams.set("orderBy", "modifiedTime desc")
  url.searchParams.set("pageSize", "100")
  url.searchParams.set("q", "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false")
  url.searchParams.set("supportsAllDrives", "true")

  const response = await request(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8_000),
  })
  const parsed = spreadsheetListSchema.safeParse(await response.json().catch(() => null))
  if (!response.ok || !parsed.success) throw new Error("Google Sheets could not be loaded.")
  return parsed.data.files.map((file) => ({
    id: file.id,
    modifiedTime: file.modifiedTime ?? null,
    name: file.name,
    webViewLink: file.webViewLink ?? null,
  }))
}
