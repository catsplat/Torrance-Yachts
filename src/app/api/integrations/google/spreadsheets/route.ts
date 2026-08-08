import { NextResponse } from "next/server"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  listGoogleSpreadsheets,
} from "@/lib/integrations/google-workspace"
import { getGoogleWorkspaceCredentials } from "@/lib/integrations/google-workspace-server"

export async function GET() {
  const context = await getAuthenticatedRequestContext()
  if (!context) return NextResponse.json({ message: "Sign in again." }, { status: 401 })
  if (context.role !== "administrator") {
    return NextResponse.json({ message: "Administrator access is required." }, { status: 403 })
  }

  try {
    const credentials = await getGoogleWorkspaceCredentials(context.userId)
    const spreadsheets = await listGoogleSpreadsheets(credentials)
    return NextResponse.json({ spreadsheets }, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Google Sheets could not be loaded.",
    }, { status: 502 })
  }
}
