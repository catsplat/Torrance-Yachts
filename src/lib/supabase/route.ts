import "server-only"

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getSupabaseConfig } from "@/lib/supabase/config"
import type { Database } from "@/types/database"

type PendingCookie = {
  name: string
  options: CookieOptions
  value: string
}

/**
 * Auth route handlers must attach Supabase's newly issued cookies to the exact
 * response that redirects the browser. Server Component cookie writes alone do
 * not survive a separately constructed `NextResponse.redirect`.
 */
export async function createRouteClient() {
  const cookieStore = await cookies()
  const { publishableKey, url } = getSupabaseConfig()
  let pendingCookies: PendingCookie[] = []
  let pendingHeaders: Record<string, string> = {}

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet, headers) {
        pendingCookies = cookiesToSet
        pendingHeaders = headers
      },
    },
  })

  return {
    redirect(destination: URL) {
      const response = NextResponse.redirect(destination)
      pendingCookies.forEach(({ name, options, value }) => response.cookies.set(name, value, options))
      Object.entries(pendingHeaders).forEach(([name, value]) => response.headers.set(name, value))
      return response
    },
    supabase,
  }
}
