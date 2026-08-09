import { NextResponse } from "next/server"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import { listGoogleDriveFolders, safeGoogleConnectionMessage } from "@/lib/integrations/google-workspace"
import { getActiveGoogleWorkspaceDispatchCredentials } from "@/lib/integrations/google-workspace-server"

export async function GET() {
  const context = await getAuthenticatedRequestContext()
  if (!context) return NextResponse.json({ message: "Sign in again." }, { status: 401 })
  if (context.role !== "administrator") {
    return NextResponse.json({ message: "Administrator access is required." }, { status: 403 })
  }
  try {
    const credentials = await getActiveGoogleWorkspaceDispatchCredentials()
    const folders = await listGoogleDriveFolders(credentials)
    return NextResponse.json({ folders }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    return NextResponse.json({
      message: safeGoogleConnectionMessage(error, "Google Drive folders could not be loaded."),
    }, { status: 502 })
  }
}
