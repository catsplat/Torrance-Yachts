import { describe, expect, it } from "vitest"

import {
  contractAiSuggestionSchema,
  contractSuggestionRevisionSchema,
  emailAiSuggestionSchema,
} from "./schemas"

describe("Phase 10 AI schemas", () => {
  it("accepts a bounded structured email suggestion", () => {
    expect(emailAiSuggestionSchema.safeParse({
      classification: "new_enquiry",
      confidence: 0.9,
      confidence_reason: "Dates and yacht were explicit.",
      draft: { body: "A reviewed draft.", subject: "Re: enquiry" },
      evidence: [{ confidence: 0.9, excerpt: "10 guests", field_path: "extracted.guest_count" }],
      extracted: {
        budget_amount: 180000,
        charter_end_date: "2026-08-21",
        charter_start_date: "2026-08-14",
        company_name: null,
        currency: "EUR",
        customer_email: "guest@example.test",
        customer_name: "Synthetic Guest",
        customer_phone: null,
        disembarkation_port: "Athens",
        embarkation_port: "Athens",
        guest_count: 10,
        requested_yacht_name: "M/Y Asteria",
        requirements: [],
      },
      summary: "Synthetic charter enquiry.",
    }).success).toBe(true)
  })

  it("rejects invalid confidence and arbitrary classifications", () => {
    const result = emailAiSuggestionSchema.safeParse({
      classification: "automatically_book",
      confidence: 2,
    })
    expect(result.success).toBe(false)
  })

  it("limits a contract extraction to three instalments", () => {
    const base = {
      confidence: 0.8,
      confidence_reason: "Explicit contract clauses.",
      evidence: [],
      extracted: {
        broker_company_name: null,
        broker_name: null,
        charter_end_date: "2026-08-21",
        charter_fee: 180000,
        charter_start_date: "2026-08-14",
        charterer_name: null,
        commission_rate: 2,
        currency: "EUR",
        disembarkation_port: "Athens",
        embarkation_port: "Athens",
        instalments: Array.from({ length: 4 }, (_, index) => ({
          amount: 45000,
          due_date: `2026-0${index + 1}-01`,
        })),
        tax_rate: 5,
        yacht_name: "M/Y Asteria",
      },
      summary: "Contract suggestion.",
    }
    expect(contractAiSuggestionSchema.safeParse(base).success).toBe(false)
  })

  it("requires paired instalment dates and amounts during correction", () => {
    const result = contractSuggestionRevisionSchema.safeParse({
      brokerCompanyName: "",
      brokerName: "",
      charterEndDate: "",
      charterFee: "",
      charterStartDate: "",
      chartererName: "",
      commissionRate: "",
      correctionReason: "Checked contract",
      currency: "",
      disembarkationPort: "",
      embarkationPort: "",
      instalment1Amount: "90000",
      instalment1Date: "",
      instalment2Amount: "",
      instalment2Date: "",
      instalment3Amount: "",
      instalment3Date: "",
      suggestionId: "00000000-0000-4000-8000-000000000001",
      summary: "Reviewed",
      taxRate: "",
      yachtName: "",
    })
    expect(result.success).toBe(false)
  })
})
