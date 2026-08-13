import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { validateDeployedServerEnvironment } from "./server"

const valid = {
  APP_BASE_URL: "https://operations.example.test",
  APP_ENVIRONMENT: "production",
  AUTOMATION_SHARED_SECRET: "a".repeat(32),
  DEPLOYMENT_IMAGE_ENVIRONMENT: "production",
  MFA_ENFORCEMENT_ENABLED: "true",
  MONITORING_SHARED_SECRET: "m".repeat(32),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key-value",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "secret-key-value-long",
  TRUST_PROXY_HEADERS: "true",
}

describe("deployed server environment", () => {
  it("does not impose production requirements on local development", () => {
    expect(() => validateDeployedServerEnvironment({ APP_ENVIRONMENT: "development" })).not.toThrow()
  })

  it("accepts the secure deployed environment contract", () => {
    expect(() => validateDeployedServerEnvironment(valid)).not.toThrow()
  })

  it("rejects disabled MFA and missing privileged configuration", () => {
    expect(() => validateDeployedServerEnvironment({
      ...valid,
      MFA_ENFORCEMENT_ENABLED: "false",
      SUPABASE_SECRET_KEY: "",
    })).toThrow(/MFA_ENFORCEMENT_ENABLED, SUPABASE_SECRET_KEY/)
  })

  it("rejects local Supabase in production", () => {
    expect(() => validateDeployedServerEnvironment({
      ...valid,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    })).toThrow(/production cannot use local Supabase/)
  })

  it("rejects an image declared for a different deployment environment", () => {
    expect(() => validateDeployedServerEnvironment({
      ...valid,
      APP_ENVIRONMENT: "staging",
    })).toThrow(/image environment does not match APP_ENVIRONMENT/)
  })
})
