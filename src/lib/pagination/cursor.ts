import "server-only"

import { z } from "zod"

const cursorSchema = z.object({
  id: z.uuid(),
  updatedAt: z.iso.datetime(),
})

export type UpdatedAtCursor = z.infer<typeof cursorSchema>

export function decodeUpdatedAtCursor(value: string | undefined): UpdatedAtCursor | null {
  if (!value || value.length > 256) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    return cursorSchema.safeParse(parsed).data ?? null
  } catch {
    return null
  }
}

export function encodeUpdatedAtCursor(cursor: UpdatedAtCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}
