import { NextResponse } from "next/server"

import { generateNextPendingEmailSuggestion } from "@/lib/ai/service"
import { hasValidAutomationToken } from "@/lib/integrations/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  if (!hasValidAutomationToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    let aiResult: Awaited<ReturnType<typeof generateNextPendingEmailSuggestion>> | null = null
    let aiError = false
    try {
      aiResult = await generateNextPendingEmailSuggestion()
    } catch {
      aiError = true
    }
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("run_automation_tick", {
      p_as_of: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: "Automation tick failed" }, { status: 500 })
    const summary = data && typeof data === "object" && !Array.isArray(data) ? data : {}
    return NextResponse.json({
      ...summary,
      ai_email_processed: aiResult?.processed ?? false,
      ai_processing_failed: aiError,
    })
  } catch {
    return NextResponse.json({ error: "Automation is not configured" }, { status: 503 })
  }
}
