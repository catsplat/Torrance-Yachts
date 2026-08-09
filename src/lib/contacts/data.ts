import "server-only"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import type { Enums } from "@/types/database"

export const directoryPageSize = 50

const directoryCursorSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(200),
})

function decodeCursor(value: string | undefined) {
  if (!value || value.length > 512) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    return directoryCursorSchema.safeParse(parsed).data ?? null
  } catch {
    return null
  }
}

function encodeCursor(name: string, id: string) {
  return Buffer.from(JSON.stringify({ id, name })).toString("base64url")
}

export async function getContactRegisterPage(filters: {
  active?: boolean
  cursor?: string
  query?: string
  role?: Enums<"contact_role">
}) {
  const cursor = decodeCursor(filters.cursor)
  const supabase = await createClient()
  const [{ data, error }, { data: totalCount, error: countError }] = await Promise.all([
    supabase.rpc("list_contact_register_page", {
      p_active: filters.active,
      p_cursor_id: cursor?.id,
      p_cursor_name: cursor?.name,
      p_limit: directoryPageSize + 1,
      p_query: filters.query,
      p_role: filters.role,
    }),
    supabase.rpc("count_contact_register", {
      p_active: filters.active,
      p_query: filters.query,
      p_role: filters.role,
    }),
  ])
  if (error || countError) throw new Error("Unable to load contact records.")

  const hasNextPage = data.length > directoryPageSize
  const contacts = data.slice(0, directoryPageSize)
  const last = contacts.at(-1)
  return {
    contacts,
    nextCursor: hasNextPage && last ? encodeCursor(last.sort_name, last.id) : null,
    totalCount: totalCount ?? 0,
  }
}

export async function getCompanyRegisterPage(filters: {
  active?: boolean
  cursor?: string
  query?: string
}) {
  const cursor = decodeCursor(filters.cursor)
  const supabase = await createClient()
  const [{ data, error }, { data: totalCount, error: countError }] = await Promise.all([
    supabase.rpc("list_company_register_page", {
      p_active: filters.active,
      p_cursor_id: cursor?.id,
      p_cursor_name: cursor?.name,
      p_limit: directoryPageSize + 1,
      p_query: filters.query,
    }),
    supabase.rpc("count_company_register", {
      p_active: filters.active,
      p_query: filters.query,
    }),
  ])
  if (error || countError) throw new Error("Unable to load company records.")

  const hasNextPage = data.length > directoryPageSize
  const companies = data.slice(0, directoryPageSize)
  const last = companies.at(-1)
  return {
    companies,
    nextCursor: hasNextPage && last ? encodeCursor(last.sort_name, last.id) : null,
    totalCount: totalCount ?? 0,
  }
}
