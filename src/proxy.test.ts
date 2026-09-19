import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const updateSession = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase/proxy", () => ({ updateSession }))
import { proxy } from "./proxy"

describe("native helper routing", () => {
  beforeEach(() => updateSession.mockReset())
  it.each(["/torrance-local-ai.mjs", "/api/local-ai/pair", "/api/local-ai/jobs/claim", "/api/local-ai/status"])("leaves %s to its own authentication boundary", async (path) => {
    const response = await proxy(new NextRequest(`https://example.test${path}`))
    expect(response.status).toBe(200)
    expect(updateSession).not.toHaveBeenCalled()
  })
  it("does not exempt arbitrary scripts or workspace pages", async () => {
    updateSession.mockResolvedValue(new Response(null, { status: 401 }))
    for (const path of ["/other.mjs", "/settings/ai", "/api/local-ai-other"]) {
      await proxy(new NextRequest(`https://example.test${path}`))
    }
    expect(updateSession).toHaveBeenCalledTimes(3)
  })
})
