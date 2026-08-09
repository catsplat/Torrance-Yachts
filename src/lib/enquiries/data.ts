import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Enums } from "@/types/database"

import { decodeUpdatedAtCursor, encodeUpdatedAtCursor } from "@/lib/pagination/cursor"

export const enquiryRegisterPageSize = 50

export type EnquiryRegisterFilters = {
  cursor?: string
  priority?: Enums<"enquiry_priority">
  query?: string
  stale?: boolean
  status?: Enums<"enquiry_status"> | "all" | "open"
  yachtId?: string
}

export async function getEnquiryRegisterPage(filters: EnquiryRegisterFilters) {
  const cursor = decodeUpdatedAtCursor(filters.cursor)
  const status = filters.status === "open" || filters.status === "all" ? undefined : filters.status
  const openOnly = !filters.status || filters.status === "open"
  const supabase = await createClient()
  const args = {
    p_cursor_id: cursor?.id,
    p_cursor_updated_at: cursor?.updatedAt,
    p_limit: enquiryRegisterPageSize + 1,
    p_open_only: openOnly,
    p_priority: filters.priority,
    p_query: filters.query,
    p_status: status,
    p_yacht_id: filters.yachtId,
  }
  if (filters.stale) {
    const [{ data: page, error: pageError }, { data: totalCount, error: countError }] = await Promise.all([
      supabase.rpc("list_stale_enquiry_page", {
        p_cursor_id: cursor?.id,
        p_cursor_updated_at: cursor?.updatedAt,
        p_limit: enquiryRegisterPageSize + 1,
        p_query: filters.query,
      }),
      supabase.rpc("count_stale_enquiries", { p_query: filters.query }),
    ])
    if (pageError || countError) throw new Error("Unable to load stale enquiries.")
    const hasNextPage = page.length > enquiryRegisterPageSize
    const enquiries = page.slice(0, enquiryRegisterPageSize)
    const last = enquiries.at(-1)
    return {
      enquiries,
      nextCursor: hasNextPage && last
        ? encodeUpdatedAtCursor({ id: last.id, updatedAt: last.updated_at })
        : null,
      totalCount: totalCount ?? 0,
    }
  }
  const [{ data: page, error: pageError }, { data: totalCount, error: countError }] = await Promise.all([
    supabase.rpc("list_enquiry_register_page", args),
    supabase.rpc("count_enquiry_register", {
      p_open_only: openOnly,
      p_priority: filters.priority,
      p_query: filters.query,
      p_status: status,
      p_yacht_id: filters.yachtId,
    }),
  ])
  if (pageError || countError) throw new Error("Unable to load the complete enquiry register.")

  const hasNextPage = page.length > enquiryRegisterPageSize
  const enquiries = page.slice(0, enquiryRegisterPageSize)
  const last = enquiries.at(-1)
  return {
    enquiries,
    nextCursor: hasNextPage && last
      ? encodeUpdatedAtCursor({ id: last.id, updatedAt: last.updated_at })
      : null,
    totalCount: totalCount ?? 0,
  }
}
