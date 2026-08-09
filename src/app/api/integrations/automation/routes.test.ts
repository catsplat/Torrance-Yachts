import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ rpc: vi.fn() })),
}))
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: vi.fn(async () => true),
}))

import { POST as claimDeliveries } from "../deliveries/claim/route"
import { POST as completeDelivery } from "../deliveries/[id]/complete/route"

const endpoint = "http://localhost:3000/api/integrations/deliveries/claim"

function request(body: string, authorised = true) {
  return new Request(endpoint, {
    body,
    headers: {
      authorization: authorised ? "Bearer fictional-automation-secret" : "Bearer incorrect",
      "content-type": "application/json",
    },
    method: "POST",
  })
}

describe("automation route boundaries", () => {
  beforeEach(() => {
    vi.stubEnv("APP_ENVIRONMENT", "development")
    vi.stubEnv("AUTOMATION_SHARED_SECRET", "fictional-automation-secret")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("rejects missing or incorrect worker authentication", async () => {
    const response = await claimDeliveries(request(JSON.stringify({ workerId: "scheduler" }), false))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("rejects malformed JSON and invalid claim contracts before database access", async () => {
    const malformed = await claimDeliveries(request("{"))
    expect(malformed.status).toBe(400)

    const invalid = await claimDeliveries(request(JSON.stringify({ limit: 101, workerId: "x" })))
    expect(invalid.status).toBe(422)
  })

  it("hard-blocks the development simulator outside development", async () => {
    vi.stubEnv("APP_ENVIRONMENT", "production")
    const response = await claimDeliveries(request(JSON.stringify({
      limit: 5,
      workerId: "n8n-development-simulator",
    })))
    expect(response.status).toBe(403)
  })

  it("rejects malformed and unauthorised completion callbacks", async () => {
    const params = { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }) }
    expect((await completeDelivery(request("{}", false), params)).status).toBe(401)
    expect((await completeDelivery(request(JSON.stringify({ workerId: "x" })), params)).status).toBe(422)
  })
})
