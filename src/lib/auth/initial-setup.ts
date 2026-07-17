import "server-only"

import { deriveInitialSetupStatus, setupTokenMatches } from "@/lib/auth/initial-setup-token"
import { createAdminClient } from "@/lib/supabase/admin"

export { setupTokenMatches }

export async function getInitialAdministratorSetupStatus() {
  try {
    const admin = createAdminClient()
    const { data: count, error } = await admin.rpc("get_initial_setup_profile_count")
    if (error) throw error
    return deriveInitialSetupStatus(Number(count ?? 0), process.env.INITIAL_ADMIN_SETUP_TOKEN)
  } catch {
    return { available: false, reason: "unavailable" as const }
  }
}
