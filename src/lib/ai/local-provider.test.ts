import { describe, expect, it } from "vitest"

import { vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  createLocalContractSuggestion,
  createLocalEmailSuggestion,
} from "./local-analysis"
import { LocalAiProvider } from "./local-provider"

describe("local AI development provider", () => {
  it("implements the shared connection and model discovery contract", async () => {
    const provider = new LocalAiProvider()
    await expect(provider.listModels()).resolves.toEqual([
      { id: "deterministic-v1", label: "Deterministic charter rules" },
    ])
    await expect(provider.testConnection()).resolves.toMatchObject({
      model: "deterministic-v1",
      ok: true,
      provider: "local",
    })
  })

  it("applies the saved detailed summary preference", async () => {
    const provider = new LocalAiProvider({ summaryStyle: "detailed" })
    const result = await provider.analyzeEmail({
      body: "Please advise M/Y Asteria for 10 guests from 14 August 2026 to 21 August 2026.",
      receivedAt: "2026-07-16T08:30:00Z",
      senderEmail: "alex@example.test",
      senderName: "Alex",
      subject: "Charter availability",
      yachts: [],
    }, "synthetic-user")
    expect(result.output.summary).toContain(result.output.confidence_reason)
  })

  it("extracts representative yacht enquiry facts without a paid service", async () => {
    const result = createLocalEmailSuggestion({
      body: "Please advise M/Y Asteria for 10 guests from 14 August 2026 to 21 August 2026, Athens to Athens, budget EUR 180,000.",
      receivedAt: "2026-07-16T08:30:00Z",
      senderEmail: "alex@example.test",
      senderName: "Alex",
      subject: "Charter availability",
      yachts: [{
        name: "M/Y Asteria",
        overview: "Synthetic yacht.",
        portGuidance: "Athens round trips are preferred.",
        rates: [{
          currency: "EUR",
          name: "High season",
          taxRate: 5,
          validFrom: "2026-07-01",
          validTo: "2026-08-31",
          weeklyRate: 168000,
        }],
      }],
    })
    expect(result.classification).toBe("new_enquiry")
    expect(result.extracted.guest_count).toBe(10)
    expect(result.extracted.charter_start_date).toBe("2026-08-14")
    expect(result.extracted.budget_amount).toBe(180000)
    expect(result.draft.body).toContain("M/Y Asteria")
  })

  it("extracts explicit contract values but does not calculate schedules", async () => {
    const result = createLocalContractSuggestion({
      bookingReference: "BKG-TEST",
      sourceText: "M/Y ASTERIA charter from 14 August 2026 to 21 August 2026. Charter fee EUR 180,000. 5% VAT. 2% commission.",
    })
    expect(result.extracted.charter_fee).toBe(180000)
    expect(result.extracted.tax_rate).toBe(5)
    expect(result.extracted.commission_rate).toBe(2)
    expect(result.extracted.instalments).toEqual([])
  })
})
