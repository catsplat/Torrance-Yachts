import { NextResponse } from "next/server"
import { z } from "zod"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"

const querySchema = z.string().trim().min(2).max(120)

export async function GET(request: Request) {
  const context = await getAuthenticatedRequestContext()
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = querySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "")
  if (!parsed.success) return NextResponse.json({ enquiries: [] })
  const { data, error } = await context.supabase.rpc("list_active_enquiry_choices", {
    p_limit: 20,
    p_query: parsed.data,
  })
  if (error) return NextResponse.json({ error: "Search unavailable" }, { status: 500 })
  return NextResponse.json({ enquiries: data }, {
    headers: { "Cache-Control": "private, no-store" },
  })
}
