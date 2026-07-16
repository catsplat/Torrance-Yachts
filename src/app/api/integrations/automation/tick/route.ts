import { NextResponse } from "next/server"

import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("run_automation_tick", {
      p_as_of: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: "Automation tick failed" }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Automation is not configured" }, { status: 503 })
  }
}
