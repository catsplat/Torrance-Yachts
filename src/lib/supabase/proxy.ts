import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabaseConfig } from "@/lib/supabase/config"
import type { Database } from "@/types/database"

export async function updateSession(request: NextRequest, requestHeaders = request.headers) {
  const { publishableKey, url } = getSupabaseConfig()
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: requestHeaders } })
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: verifiedToken } = await supabase.auth.getClaims()
  const claims = verifiedToken?.claims

  const isLoginRoute = request.nextUrl.pathname === "/login"

  if (!claims?.sub && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.search = ""
    return NextResponse.redirect(loginUrl)
  }

  return response
}
