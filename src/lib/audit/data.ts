import "server-only"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const pageSize = 50
const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.number().int().positive() })

function decodeCursor(value: string | undefined) {
  if (!value || value.length > 256) return null
  try { return cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))).data ?? null }
  catch { return null }
}

export async function getAuditPage(filters: {
  action?: string; actorId?: string; cursor?: string; entityType?: string
  from?: string; source?: string; to?: string
}) {
  const cursor = decodeCursor(filters.cursor)
  const from = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : null
  const to = filters.to ? new Date(`${filters.to}T00:00:00.000Z`) : null
  const validFrom = from && !Number.isNaN(from.getTime()) ? from.toISOString() : undefined
  const validTo = to && !Number.isNaN(to.getTime()) ? new Date(to.getTime() + 86_400_000).toISOString() : undefined
  const supabase = await createClient()
  const [{ data, error }, { data: count, error: countError }, profiles] = await Promise.all([
    supabase.rpc("list_audit_event_page", {
      p_action: filters.action || undefined, p_actor_user_id: filters.actorId || undefined,
      p_cursor_created_at: cursor?.createdAt, p_cursor_id: cursor?.id,
      p_entity_type: filters.entityType || undefined, p_limit: pageSize + 1,
      p_from: validFrom, p_source: filters.source || undefined, p_to: validTo,
    }),
    supabase.rpc("count_audit_events", {
      p_action: filters.action || undefined, p_actor_user_id: filters.actorId || undefined,
      p_entity_type: filters.entityType || undefined, p_from: validFrom,
      p_source: filters.source || undefined, p_to: validTo,
    }),
    supabase.rpc("list_active_staff_directory"),
  ])
  if (error || countError || profiles.error) throw new Error("Audit history could not be loaded.")
  const events = data.slice(0, pageSize)
  const last = events.at(-1)
  return {
    events, profiles: profiles.data, totalCount: Number(count ?? 0),
    nextCursor: data.length > pageSize && last
      ? Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString("base64url") : null,
  }
}
