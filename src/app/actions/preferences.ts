"use server"

import { revalidatePath } from "next/cache"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"

export async function setThemeAction(formData: FormData) {
  const theme = formData.get("theme") === "dark" ? "dark" : "light"
  const context = await getAuthenticatedRequestContext()
  if (!context) return

  const { error } = await context.supabase.rpc("update_my_ui_theme", { p_theme: theme })
  if (error) throw new Error("Your interface preference could not be saved.")

  revalidatePath("/", "layout")
}
