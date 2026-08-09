import "server-only"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export const notificationPageSize = 50

const notificationCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
})

function decodeCursor(value: string | undefined) {
  if (!value || value.length > 256) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    return notificationCursorSchema.safeParse(parsed).data ?? null
  } catch {
    return null
  }
}

export async function getNotificationPage(filters: {
  cursor?: string
  read?: boolean
}) {
  const cursor = decodeCursor(filters.cursor)
  const supabase = await createClient()
  const [
    { data, error },
    { data: totalCount, error: countError },
    { data: unreadCount, error: unreadCountError },
  ] = await Promise.all([
    supabase.rpc("list_my_notification_page", {
      p_cursor_created_at: cursor?.createdAt,
      p_cursor_id: cursor?.id,
      p_limit: notificationPageSize + 1,
      p_read: filters.read,
    }),
    supabase.rpc("count_my_notifications", { p_read: filters.read }),
    supabase.rpc("count_my_notifications", { p_read: false }),
  ])
  if (error || countError || unreadCountError) throw new Error("Unable to load notifications.")

  const hasNextPage = data.length > notificationPageSize
  const notifications = data.slice(0, notificationPageSize)
  const last = notifications.at(-1)
  return {
    nextCursor: hasNextPage && last
      ? Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString("base64url")
      : null,
    notifications,
    totalCount: totalCount ?? 0,
    unreadCount: unreadCount ?? 0,
  }
}
