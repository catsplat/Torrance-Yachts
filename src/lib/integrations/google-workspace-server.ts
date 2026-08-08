import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import type { GoogleWorkspaceCredentials } from "@/lib/integrations/google-workspace"

export async function getGoogleWorkspaceCredentials(userId: string): Promise<GoogleWorkspaceCredentials> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("get_user_google_workspace_credentials", {
    p_user_id: userId,
  })
  const credentials = data?.[0]
  if (error || !credentials) throw new Error("Connect Google Workspace first.")
  return credentials
}
