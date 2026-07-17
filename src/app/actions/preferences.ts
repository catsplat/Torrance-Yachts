"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

export async function setThemeAction(formData: FormData) {
  const theme = formData.get("theme") === "dark" ? "dark" : "light"

  const cookieStore = await cookies()
  cookieStore.set("ty-theme", theme, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  revalidatePath("/", "layout")
}
