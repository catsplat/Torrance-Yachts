import { describe, expect, it, vi } from "vitest"

import {
  dispatchGoogleCalendar,
  dispatchGoogleDrive,
  dispatchGoogleSheets,
  safeGoogleProviderFailure,
} from "./google-provider"
import type { GoogleWorkspaceCredentials } from "./google-workspace"

const credentials: GoogleWorkspaceCredentials = {
  account_email: "operator@example.test",
  client_id: "synthetic-client",
  client_secret: "synthetic-secret",
  refresh_token: "synthetic-refresh",
  scopes: [],
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status,
  })
}

describe("Google Workspace delivery adapters", () => {
  it("upserts a private Calendar event with a stable event ID", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access_token: "access" }))
      .mockResolvedValueOnce(json({ error: { message: "missing" } }, 404))
      .mockResolvedValueOnce(json({
        htmlLink: "https://calendar.google.com/event?eid=synthetic",
        id: "0123456789abcdef0123456789abcdef",
      }))
    const result = await dispatchGoogleCalendar(credentials, "primary", {
      all_day: false,
      description: "Synthetic charter start",
      end: "2026-09-01T13:00:00.000Z",
      event_id: "0123456789abcdef0123456789abcdef",
      send_updates: "none",
      start: "2026-09-01T12:00:00.000Z",
      status: "scheduled",
      timezone: "Europe/London",
      title: "Synthetic charter",
      visibility: "private",
    }, request)
    expect(result.externalId).toBe("0123456789abcdef0123456789abcdef")
    expect(request).toHaveBeenCalledTimes(3)
    expect(request.mock.calls[1]?.[1]?.method).toBe("PUT")
    expect(request.mock.calls[2]?.[1]?.method).toBe("POST")
    expect(JSON.parse(String(request.mock.calls[2]?.[1]?.body))).toMatchObject({
      id: "0123456789abcdef0123456789abcdef",
      visibility: "private",
    })
  })

  it("replaces controlled Sheets tabs using immutable IDs and RAW values", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access_token: "access" }))
      .mockResolvedValueOnce(json({
        sheets: [{ properties: { title: "Enquiries" } }],
        spreadsheetId: "sheet-1",
        spreadsheetUrl: "https://docs.google.com/spreadsheets/d/sheet-1/edit",
      }))
      .mockResolvedValueOnce(json({ replies: [] }))
      .mockResolvedValueOnce(json({ clearedRanges: [] }))
      .mockResolvedValueOnce(json({ totalUpdatedRows: 4 }))
    const result = await dispatchGoogleSheets(credentials, "sheet-1", {
      bookings: [{ id: "booking-id", reference: "BK-001", status: "confirmed" }],
      captains: [{ captain: "Synthetic Captain", id: "assignment-id", yacht: "Example Yacht" }],
      enquiries: [{ id: "enquiry-id", reference: "ENQ-001", summary: "=unsafe", status: "new" }],
      generated_at: "2026-08-09T12:00:00.000Z",
    }, request)
    expect(result.externalId).toBe("sheet-1")
    const values = JSON.parse(String(request.mock.calls[4]?.[1]?.body)) as {
      data: Array<{ values: unknown[][] }>
      valueInputOption: string
    }
    expect(values.valueInputOption).toBe("RAW")
    expect(values.data[0]?.values[0]?.[0]).toBe("id")
    expect(values.data[0]?.values[1]?.[0]).toBe("enquiry-id")
    expect(values.data[0]?.values[1]?.[4]).toBe("'=unsafe")
  })

  it("uploads a Drive file once and finds it by the delivery idempotency key", async () => {
    const uploadRequest = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access_token: "access" }))
      .mockResolvedValueOnce(json({ files: [] }))
      .mockResolvedValueOnce(json({ id: "drive-file-1", webViewLink: "https://drive.google.com/file/d/drive-file-1/view" }))
    const result = await dispatchGoogleDrive(
      credentials,
      "folder-1",
      "drive_document:synthetic:v1",
      { document_id: "00000000-0000-4000-8000-000000000001", filename: "synthetic.pdf", mime_type: "application/pdf" },
      new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      uploadRequest,
    )
    expect(result.externalId).toBe("drive-file-1")
    expect(uploadRequest.mock.calls[2]?.[1]?.body).toBeInstanceOf(FormData)

    const replayRequest = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ access_token: "access" }))
      .mockResolvedValueOnce(json({ files: [{ id: "drive-file-1", webViewLink: "https://drive.google.com/file/d/drive-file-1/view" }] }))
    await expect(dispatchGoogleDrive(
      credentials,
      "folder-1",
      "drive_document:synthetic:v1",
      { document_id: "00000000-0000-4000-8000-000000000001", filename: "synthetic.pdf", mime_type: "application/pdf" },
      new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      replayRequest,
    )).resolves.toMatchObject({ externalId: "drive-file-1" })
    expect(replayRequest).toHaveBeenCalledTimes(2)
  })

  it("classifies permission failures as visible non-retryable failures", () => {
    expect(safeGoogleProviderFailure(new Error("Reconnect Google Workspace."))).toEqual({
      errorCode: "google_authorisation",
      errorMessage: "Reconnect Google Workspace.",
      retryable: false,
    })
  })
})
