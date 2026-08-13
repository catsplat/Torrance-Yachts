import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { GET as getLiveness } from "./live/route"
import { GET as getReadiness } from "./ready/route"

const originalMonitoringSecret = process.env.MONITORING_SHARED_SECRET

afterEach(() => {
  if (originalMonitoringSecret === undefined) delete process.env.MONITORING_SHARED_SECRET
  else process.env.MONITORING_SHARED_SECRET = originalMonitoringSecret
})

describe("production health routes", () => {
  it("returns only minimal liveness information without authentication", async () => {
    const response = getLiveness()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(payload).toEqual({
      service: "torrance-yachts-platform",
      status: "ok",
      version: expect.any(String),
    })
    expect(JSON.stringify(payload)).not.toMatch(/database|storage|secret|token|user/i)
  })

  it("does not expose readiness diagnostics without the monitoring credential", async () => {
    process.env.MONITORING_SHARED_SECRET = "m".repeat(32)
    const response = await getReadiness(new Request("https://operations.example.test/api/health/ready"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })
})
