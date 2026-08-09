import { z } from "zod"

import {
  GoogleOAuthError,
  refreshGoogleAccessToken,
  type GoogleWorkspaceCredentials,
} from "./google-workspace"

type FetchImplementation = typeof fetch

export type GoogleProviderResult = {
  externalId: string
  externalUrl: string
}

export class GoogleProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = "GoogleProviderError"
  }
}

const calendarPayloadSchema = z.object({
  all_day: z.boolean(),
  description: z.string().nullable(),
  end: z.iso.datetime(),
  event_id: z.string().regex(/^[0-9a-f]{16,128}$/),
  send_updates: z.literal("none"),
  start: z.iso.datetime(),
  status: z.string().min(1).max(80),
  timezone: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  visibility: z.literal("private"),
})

const sheetRowSchema = z.record(z.string(), z.union([
  z.string(), z.number(), z.boolean(), z.null(),
]))
const sheetsPayloadSchema = z.object({
  bookings: z.array(sheetRowSchema).max(25_000),
  captains: z.array(sheetRowSchema).max(25_000),
  enquiries: z.array(sheetRowSchema).max(25_000),
  generated_at: z.iso.datetime(),
})

const drivePayloadSchema = z.object({
  document_id: z.uuid(),
  filename: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(200),
})

const googleErrorSchema = z.object({
  error: z.object({
    code: z.number().optional(),
    message: z.string().optional(),
  }).optional(),
})

function providerFailure(status: number, body: unknown, fallback: string) {
  const parsed = googleErrorSchema.safeParse(body)
  const providerMessage = parsed.success ? parsed.data.error?.message : undefined
  if (status === 401 || status === 403) {
    return new GoogleProviderError(
      "Reconnect Google Workspace or review the granted permissions.",
      "google_authorisation",
      false,
    )
  }
  if (status === 404) {
    return new GoogleProviderError(providerMessage || fallback, "google_target_missing", false)
  }
  if (status === 408 || status === 429 || status >= 500) {
    return new GoogleProviderError(providerMessage || fallback, "google_transient", true)
  }
  return new GoogleProviderError(providerMessage || fallback, "google_rejected", false)
}

async function responseJson(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>
}

function bearer(accessToken: string, json = true) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  }
}

export async function dispatchGoogleCalendar(
  credentials: GoogleWorkspaceCredentials,
  targetCalendarId: string,
  untrustedPayload: unknown,
  request: FetchImplementation = fetch,
  signal: AbortSignal = AbortSignal.timeout(10_000),
): Promise<GoogleProviderResult> {
  const parsed = calendarPayloadSchema.safeParse(untrustedPayload)
  if (!parsed.success) throw new GoogleProviderError("Calendar delivery is malformed.", "invalid_payload", false)
  const payload = parsed.data
  const accessToken = await refreshGoogleAccessToken(credentials, request, signal)
  const calendarId = targetCalendarId.trim() || "primary"
  const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(payload.event_id)}?sendUpdates=none`

  if (payload.status === "cancelled") {
    const deletion = await request(eventUrl, {
      headers: bearer(accessToken, false),
      method: "DELETE",
      signal,
    })
    if (!deletion.ok && deletion.status !== 404) {
      throw providerFailure(deletion.status, await responseJson(deletion), "Google Calendar rejected the cancellation.")
    }
    return { externalId: payload.event_id, externalUrl: "" }
  }

  const eventBody = {
    description: payload.description ?? "",
    end: { dateTime: payload.end, timeZone: payload.timezone },
    extendedProperties: { private: { torranceEventId: payload.event_id } },
    start: { dateTime: payload.start, timeZone: payload.timezone },
    status: "confirmed",
    summary: payload.title,
    transparency: "opaque",
    visibility: "private",
  }
  let response = await request(eventUrl, {
    body: JSON.stringify(eventBody),
    headers: bearer(accessToken),
    method: "PUT",
    signal,
  })
  if (response.status === 404) {
    response = await request(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
      {
        body: JSON.stringify({ id: payload.event_id, ...eventBody }),
        headers: bearer(accessToken),
        method: "POST",
        signal,
      },
    )
  }
  const body = await responseJson(response)
  const result = z.object({ htmlLink: z.url().optional(), id: z.string().min(1) }).safeParse(body)
  if (!response.ok || !result.success) {
    throw providerFailure(response.status, body, "Google Calendar rejected the event.")
  }
  return { externalId: result.data.id, externalUrl: result.data.htmlLink ?? "" }
}

const sheetDefinitions = [
  {
    fields: ["id", "reference", "status", "priority", "summary", "yacht", "start_date", "end_date", "updated_at"],
    key: "enquiries",
    title: "Enquiries",
  },
  {
    fields: ["id", "reference", "status", "yacht", "start_date", "end_date", "currency", "charter_fee"],
    key: "bookings",
    title: "Bookings",
  },
  {
    fields: ["id", "yacht_id", "contact_id", "yacht", "captain", "email", "phone"],
    key: "captains",
    title: "Captains",
  },
] as const

function safeSheetValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return ""
  if (typeof value !== "string") return value
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

export async function dispatchGoogleSheets(
  credentials: GoogleWorkspaceCredentials,
  spreadsheetId: string,
  untrustedPayload: unknown,
  request: FetchImplementation = fetch,
  signal: AbortSignal = AbortSignal.timeout(15_000),
): Promise<GoogleProviderResult> {
  const parsed = sheetsPayloadSchema.safeParse(untrustedPayload)
  if (!parsed.success || !spreadsheetId.trim()) {
    throw new GoogleProviderError("The reporting spreadsheet delivery is not configured.", "invalid_payload", false)
  }
  const accessToken = await refreshGoogleAccessToken(credentials, request, signal)
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`
  const metadataResponse = await request(`${base}?fields=spreadsheetId,spreadsheetUrl,sheets.properties.title`, {
    headers: bearer(accessToken, false),
    signal,
  })
  const metadataBody = await responseJson(metadataResponse)
  const metadata = z.object({
    sheets: z.array(z.object({ properties: z.object({ title: z.string() }) })).default([]),
    spreadsheetId: z.string().min(1),
    spreadsheetUrl: z.url().optional(),
  }).safeParse(metadataBody)
  if (!metadataResponse.ok || !metadata.success) {
    throw providerFailure(metadataResponse.status, metadataBody, "The reporting spreadsheet is unavailable.")
  }
  const existing = new Set(metadata.data.sheets.map((sheet) => sheet.properties.title))
  const missing = sheetDefinitions.filter((sheet) => !existing.has(sheet.title))
  if (missing.length) {
    const addResponse = await request(`${base}:batchUpdate`, {
      body: JSON.stringify({ requests: missing.map((sheet) => ({ addSheet: { properties: { title: sheet.title } } })) }),
      headers: bearer(accessToken),
      method: "POST",
      signal,
    })
    if (!addResponse.ok) {
      throw providerFailure(addResponse.status, await responseJson(addResponse), "Spreadsheet tabs could not be created.")
    }
  }
  const clearResponse = await request(`${base}/values:batchClear`, {
    body: JSON.stringify({ ranges: sheetDefinitions.map((sheet) => `'${sheet.title}'!A:Z`) }),
    headers: bearer(accessToken),
    method: "POST",
    signal,
  })
  if (!clearResponse.ok) {
    throw providerFailure(clearResponse.status, await responseJson(clearResponse), "The previous spreadsheet snapshot could not be cleared.")
  }
  const valueResponse = await request(`${base}/values:batchUpdate`, {
    body: JSON.stringify({
      data: sheetDefinitions.map((sheet) => ({
        majorDimension: "ROWS",
        range: `'${sheet.title}'!A1`,
        values: [
          sheet.fields.map((field) => field.replaceAll("_", " ")),
          ...parsed.data[sheet.key].map((row) => sheet.fields.map((field) => safeSheetValue(row[field]))),
        ],
      })),
      includeValuesInResponse: false,
      valueInputOption: "RAW",
    }),
    headers: bearer(accessToken),
    method: "POST",
    signal,
  })
  if (!valueResponse.ok) {
    throw providerFailure(valueResponse.status, await responseJson(valueResponse), "The spreadsheet snapshot could not be written.")
  }
  return {
    externalId: metadata.data.spreadsheetId,
    externalUrl: metadata.data.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${metadata.data.spreadsheetId}/edit`,
  }
}

export async function dispatchGoogleDrive(
  credentials: GoogleWorkspaceCredentials,
  targetFolderId: string,
  idempotencyKey: string,
  untrustedPayload: unknown,
  file: Uint8Array,
  request: FetchImplementation = fetch,
  signal: AbortSignal = AbortSignal.timeout(15_000),
): Promise<GoogleProviderResult> {
  const parsed = drivePayloadSchema.safeParse(untrustedPayload)
  if (!parsed.success || !targetFolderId.trim() || !file.byteLength) {
    throw new GoogleProviderError("The Drive delivery is not configured or has no file.", "invalid_payload", false)
  }
  const accessToken = await refreshGoogleAccessToken(credentials, request, signal)
  const escapedKey = idempotencyKey.replaceAll("'", "\\'")
  const lookupUrl = new URL("https://www.googleapis.com/drive/v3/files")
  lookupUrl.searchParams.set("fields", "files(id,webViewLink)")
  lookupUrl.searchParams.set("q", `appProperties has { key='torranceDelivery' and value='${escapedKey}' } and trashed = false`)
  lookupUrl.searchParams.set("spaces", "drive")
  const lookupResponse = await request(lookupUrl, { headers: bearer(accessToken, false), signal })
  const lookupBody = await responseJson(lookupResponse)
  const lookup = z.object({ files: z.array(z.object({ id: z.string(), webViewLink: z.url().optional() })).default([]) }).safeParse(lookupBody)
  if (!lookupResponse.ok || !lookup.success) {
    throw providerFailure(lookupResponse.status, lookupBody, "Google Drive could not check for an existing copy.")
  }
  const existing = lookup.data.files[0]
  if (existing) return { externalId: existing.id, externalUrl: existing.webViewLink ?? "" }

  const form = new FormData()
  form.append("metadata", new Blob([JSON.stringify({
    appProperties: { torranceDelivery: idempotencyKey },
    name: parsed.data.filename,
    parents: [targetFolderId],
  })], { type: "application/json" }))
  const fileBuffer = Uint8Array.from(file).buffer
  form.append("file", new Blob([fileBuffer], { type: parsed.data.mime_type }), parsed.data.filename)
  const uploadResponse = await request(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      body: form,
      headers: bearer(accessToken, false),
      method: "POST",
      signal,
    },
  )
  const uploadBody = await responseJson(uploadResponse)
  const uploaded = z.object({ id: z.string().min(1), webViewLink: z.url().optional() }).safeParse(uploadBody)
  if (!uploadResponse.ok || !uploaded.success) {
    throw providerFailure(uploadResponse.status, uploadBody, "Google Drive rejected the document copy.")
  }
  return { externalId: uploaded.data.id, externalUrl: uploaded.data.webViewLink ?? "" }
}

export function safeGoogleProviderFailure(error: unknown) {
  if (error instanceof GoogleOAuthError) {
    return {
      errorCode: "google_authorisation",
      errorMessage: error.message,
      ...(error.requiresReauthentication ? { requiresReauthentication: true } : {}),
      retryable: !error.requiresReauthentication,
    }
  }
  if (error instanceof GoogleProviderError) {
    return { errorCode: error.code, errorMessage: error.message, retryable: error.retryable }
  }
  const message = error instanceof Error ? error.message : "Google Workspace delivery failed."
  const normalized = message.toLowerCase()
  return {
    errorCode: normalized.includes("reconnect") ? "google_authorisation" : "google_provider_error",
    errorMessage: message.slice(0, 500),
    retryable: !normalized.includes("reconnect"),
  }
}
