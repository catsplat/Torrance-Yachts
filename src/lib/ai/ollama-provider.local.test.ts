import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { OllamaProvider } from "./ollama-provider"

const runLocalOllama = process.env.RUN_LOCAL_OLLAMA_TESTS === "true"

describe.skipIf(!runLocalOllama)("local Ollama acceptance", () => {
  it("returns schema-valid, review-only structured email analysis", async () => {
    const result = await new OllamaProvider().analyzeEmail({
      body: [
        "Dear Torrance Yachts team,",
        "",
        "We are looking for a seven-night family charter aboard M/Y Asteria for 10 guests from 14 August 2026 to 21 August 2026.",
        "Athens to Athens would be ideal. Our indicative budget is EUR 180,000 before applicable tax.",
        "",
        "Kind regards,",
        "Alex Morgan",
      ].join("\n"),
      receivedAt: "2026-07-26T09:00:00.000Z",
      senderEmail: "alex.morgan@example.test",
      senderName: "Alex Morgan",
      subject: "Offline rehearsal: August family charter enquiry",
      yachts: [{
        name: "M/Y Asteria",
        overview: "Fictional local demonstration yacht.",
        portGuidance: "Athens to Athens is preferred.",
        rates: [],
      }],
    }, "local_acceptance_test")

    expect(result.provider).toBe("ollama")
    expect(result.output.classification).toBe("new_enquiry")
    expect(result.output.extracted.requested_yacht_name).toContain("Asteria")
    expect(result.output.extracted.charter_start_date).toBe("2026-08-14")
    expect(result.output.extracted.charter_end_date).toBe("2026-08-21")
    expect(result.output.evidence.length).toBeGreaterThan(0)
  }, 90_000)
})
