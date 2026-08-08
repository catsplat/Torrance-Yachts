import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const requestedNext = url.searchParams.get("next") ?? "/"
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/"
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: userResult } = await supabase.auth.getUser()
      const { data: profile } = userResult.user
        ? await supabase.from("profiles").select("active").eq("id", userResult.user.id).maybeSingle()
        : { data: null }
      if (profile?.active) return NextResponse.redirect(new URL(next, url.origin))
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL("/login?oauth=inactive", url.origin))
    }
  }
  return NextResponse.redirect(new URL("/login?recovery=invalid", url.origin))
}
