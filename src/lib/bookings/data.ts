import "server-only"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import type { Enums } from "@/types/database"

export const bookingRegisterPageSize = 50

const bookingCursorSchema = z.object({
  charterStartDate: z.iso.date(),
  id: z.uuid(),
})

function decodeBookingCursor(value: string | undefined) {
  if (!value || value.length > 256) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    return bookingCursorSchema.safeParse(parsed).data ?? null
  } catch {
    return null
  }
}

function encodeBookingCursor(cursor: z.infer<typeof bookingCursorSchema>) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

export type BookingRegisterFilters = {
  cursor?: string
  query?: string
  status?: Enums<"booking_status">
  yachtId?: string
}

export async function getBookingRegisterPage(filters: BookingRegisterFilters) {
  const cursor = decodeBookingCursor(filters.cursor)
  const supabase = await createClient()
  const [{ data: page, error: pageError }, { data: totalCount, error: countError }] =
    await Promise.all([
      supabase.rpc("list_booking_register_page", {
        p_cursor_charter_start_date: cursor?.charterStartDate,
        p_cursor_id: cursor?.id,
        p_limit: bookingRegisterPageSize + 1,
        p_query: filters.query,
        p_status: filters.status,
        p_yacht_id: filters.yachtId,
      }),
      supabase.rpc("count_booking_register", {
        p_query: filters.query,
        p_status: filters.status,
        p_yacht_id: filters.yachtId,
      }),
    ])
  if (pageError || countError) throw new Error("Unable to load the complete booking register.")

  const hasNextPage = page.length > bookingRegisterPageSize
  const bookings = page.slice(0, bookingRegisterPageSize)
  const last = bookings.at(-1)
  return {
    bookings,
    nextCursor: hasNextPage && last
      ? encodeBookingCursor({ charterStartDate: last.charter_start_date, id: last.id })
      : null,
    totalCount: totalCount ?? 0,
  }
}
