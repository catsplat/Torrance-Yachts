import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { decodeUpdatedAtCursor, encodeUpdatedAtCursor } from "./cursor"

describe("updated-at cursor", () => {
  const cursor = {
    id: "22000000-0000-4000-8000-000000000001",
    updatedAt: "2026-07-27T12:00:00.000Z",
  }

  it("round-trips a stable cursor", () => {
    expect(decodeUpdatedAtCursor(encodeUpdatedAtCursor(cursor))).toEqual(cursor)
  })

  it("rejects malformed, oversized, or incomplete cursors", () => {
    expect(decodeUpdatedAtCursor("not-a-cursor")).toBeNull()
    expect(decodeUpdatedAtCursor("x".repeat(257))).toBeNull()
    expect(
      decodeUpdatedAtCursor(
        Buffer.from(JSON.stringify({ id: cursor.id })).toString("base64url"),
      ),
    ).toBeNull()
  })
})
