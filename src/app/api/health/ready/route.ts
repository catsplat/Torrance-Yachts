import packageJson from "../../../../../package.json"

import { hasValidMonitoringToken } from "@/lib/operations/auth"
import { getProductionConfigurationStatus } from "@/lib/tutorial/data"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  if (!hasValidMonitoringToken(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const supabase = createAdminClient()
    const environment = process.env.APP_ENVIRONMENT === "production"
      ? "production"
      : process.env.APP_ENVIRONMENT === "staging" ? "staging" : "development"
    const readiness = await supabase.rpc("get_operational_readiness", {
      p_environment: environment,
    })
    if (readiness.error) throw new Error("Readiness query failed")
    const operational = readiness.data as {
      active_users: number
      failed_deliveries: number
      latest_restore_tested_at: string | null
    }
    const missingSettings = getProductionConfigurationStatus()
      .filter((item) => !item.configured).map((item) => item.name)
    const backupAgeDays = operational.latest_restore_tested_at
      ? Math.floor((Date.now() - new Date(operational.latest_restore_tested_at).getTime()) / 86400000)
      : null
    const critical = missingSettings.length > 0 ||
      (environment === "production" && (backupAgeDays === null || backupAgeDays > 30))
    return Response.json(
      {
        activeUsers: operational.active_users,
        backupRestoreAgeDays: backupAgeDays,
        failedDeliveries: operational.failed_deliveries,
        missingSettings,
        service: "torrance-yachts-platform",
        status: critical ? "not_ready" : operational.failed_deliveries > 0 ? "degraded" : "ready",
        version: packageJson.version,
      },
      {
        headers: { "Cache-Control": "no-store" },
        status: critical ? 503 : 200,
      },
    )
  } catch {
    return Response.json(
      { service: "torrance-yachts-platform", status: "not_ready", version: packageJson.version },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    )
  }
}
