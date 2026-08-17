import packageJson from "../../../../../package.json"

import { getDocumentScannerHealth } from "@/lib/documents/scanner"
import { checkAutomationHealth } from "@/lib/integrations/readiness"
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
    const [readiness, storage, scanner, automation] = await Promise.all([
      supabase.rpc("get_operational_readiness", { p_environment: environment }),
      supabase.storage.listBuckets(),
      getDocumentScannerHealth(),
      checkAutomationHealth(),
    ])
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
    const critical = missingSettings.length > 0 || storage.error !== null ||
      (environment === "production" && (backupAgeDays === null || backupAgeDays > 30))
    const degraded = operational.failed_deliveries > 0 || !scanner.ready || automation.state !== "ready"
    return Response.json(
      {
        activeUsers: operational.active_users,
        backupRestoreAgeDays: backupAgeDays,
        checks: {
          automation: automation.state === "ready" ? "ready" : automation.state === "setup_required" ? "not_configured" : "failed",
          database: "ready",
          documentScanner: scanner.ready ? "ready" : "failed",
          environmentConfiguration: missingSettings.length ? "not_configured" : "ready",
          storage: storage.error ? "failed" : "ready",
        },
        failedDeliveries: operational.failed_deliveries,
        missingSettings,
        service: "torrance-yachts-platform",
        status: critical ? "not_ready" : degraded ? "degraded" : "ready",
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
