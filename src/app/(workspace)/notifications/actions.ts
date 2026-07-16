"use server"

import { revalidatePath } from "next/cache"

import { notificationReadSchema } from "@/lib/alerts/validation"
import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"

export async function markNotificationReadAction(formData: FormData) {
  const parsed = notificationReadSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const context = await getAuthenticatedRequestContext()
  if (!context) return
  const { error } = await context.supabase.rpc("mark_notification_read", {
    p_notification_id: parsed.data.notificationId,
  })
  if (error) throw new Error("The notification could not be marked as read.")
  revalidatePath("/", "layout")
  revalidatePath("/notifications")
}

export async function markAllNotificationsReadAction() {
  const context = await getAuthenticatedRequestContext()
  if (!context) return
  const { error } = await context.supabase.rpc("mark_all_notifications_read")
  if (error) throw new Error("The notifications could not be marked as read.")
  revalidatePath("/", "layout")
  revalidatePath("/notifications")
}
