import "server-only"

import { createClient } from "@/lib/supabase/server"
import { decodeUpdatedAtCursor, encodeUpdatedAtCursor } from "@/lib/pagination/cursor"
import type { Enums } from "@/types/database"

export const offerRegisterPageSize = 50

export type OfferRegisterFilters = {
  cursor?: string
  query?: string
  status?: Enums<"offer_status">
  yachtId?: string
}

export async function getOfferRegisterPage(filters: OfferRegisterFilters) {
  const cursor = decodeUpdatedAtCursor(filters.cursor)
  const supabase = await createClient()
  const args = {
    p_cursor_id: cursor?.id,
    p_cursor_updated_at: cursor?.updatedAt,
    p_limit: offerRegisterPageSize + 1,
    p_query: filters.query,
    p_status: filters.status,
    p_yacht_id: filters.yachtId,
  }
  const [{ data: page, error: pageError }, { data: totalCount, error: countError }] =
    await Promise.all([
      supabase.rpc("list_offer_register_page", args),
      supabase.rpc("count_offer_register", {
        p_query: filters.query,
        p_status: filters.status,
        p_yacht_id: filters.yachtId,
      }),
    ])
  if (pageError || countError) throw new Error("Unable to load the complete offer register.")

  const hasNextPage = page.length > offerRegisterPageSize
  const offers = page.slice(0, offerRegisterPageSize)
  const last = offers.at(-1)
  return {
    nextCursor: hasNextPage && last
      ? encodeUpdatedAtCursor({ id: last.id, updatedAt: last.updated_at })
      : null,
    offers,
    totalCount: totalCount ?? 0,
  }
}
