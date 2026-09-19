import { describe, expect, it } from "vitest"

import { parseConfigurationPack } from "./schema"

describe("configuration pack validation", () => {
  it("accepts explicit operational variables", () => {
    expect(parseConfigurationPack(JSON.stringify({
      version: 1,
      communication_templates: [{
        body: "Dear {{broker_company_name}}, please confirm {{client_name}}.",
        kind: "kyc_request",
        name: "KYC request",
        subject: "KYC for {{client_name}}",
      }],
    }))).toHaveProperty("data")
  })

  it("accepts a reply template without a subject and protected operational setup data", () => {
    expect(parseConfigurationPack(JSON.stringify({
      version: 1,
      contacts: [{
        full_name: "Synthetic Captain",
        roles: ["captain"],
        yacht_assignments: [{ yacht_name: "Synthetic Yacht", responsibility: "captain", is_primary: true }],
      }],
      communication_templates: [{
        body: "Dear {{broker_name}}, please review the synthetic information.",
        kind: "captain_contact",
        name: "Captain reply",
        subject: "",
      }],
      invoice_profile: {
        issuer_address: "Synthetic issuer address", issuer_name: "Synthetic issuer", payment_instructions: "Synthetic payment instructions",
        profile_name: "Synthetic profile", recipient_address: "Synthetic recipient address", recipient_name: "Synthetic recipient",
        service_description_template: "Synthetic service description",
      },
    }))).toHaveProperty("data")
  })

  it("accepts the client workflow's numbered and lettered task codes", () => {
    expect(parseConfigurationPack(JSON.stringify({
      version: 1,
      workflow: {
        name: "Booking workflow",
        steps: [
          { code: "0.0", title: "Contract trigger" },
          { after: ["0.0"], code: "0.A", title: "Receive compliance documents" },
          { after: ["0.A"], code: "1.A", title: "Upload signed contract" },
          { after: ["1.A"], code: "4.B", title: "Potential third instalment" },
          { after: ["4.B"], code: "7", title: "Broker follow-up" },
        ],
      },
    }))).toHaveProperty("data")
  })

  it("rejects a misspelled template variable before import", () => {
    expect(parseConfigurationPack(JSON.stringify({
      version: 1,
      communication_templates: [{
        body: "Dear {{brokker_company_name}}, please confirm the details.",
        kind: "kyc_request",
        name: "KYC request",
        subject: "KYC review",
      }],
    }))).toMatchObject({ error: expect.stringContaining("Unknown template variable") })
  })

  it("uses the actual offer renderer variables and allows reply subjects", () => {
    expect(parseConfigurationPack(JSON.stringify({ version: 1, yachts: [{ name: "Synthetic Yacht", offer_template: { name: "Offer", body: "Dear {{customer_name}}, please offer {{yacht_name}} at {{weekly_rate}}." } }] }))).toHaveProperty("data")
  })
  it("rejects variables belonging to a different communication kind", () => {
    expect(parseConfigurationPack(JSON.stringify({ version: 1, communication_templates: [{ kind: "kyc_request", name: "KYC", body: "Dear {{captain_name}}, please send compliance documents." }] }))).toHaveProperty("error")
  })
  it("retains the automatic start milestone", () => {
    const result = parseConfigurationPack(JSON.stringify({ version: 1, workflow: { name: "Synthetic workflow", steps: [{ code: "0.0", title: "Start workflow", auto_complete_on_generation: true }] } }))
    expect(result).toHaveProperty("data.workflow.steps.0.auto_complete_on_generation", true)
  })
  it.each([
    [{ code: "1", title: "First task", after: ["2"] }, { code: "2", title: "Second task" }],
    [{ code: "1", title: "First task", after: ["1"] }],
    [{ code: "1", title: "First task" }, { code: "1", title: "Duplicate task" }],
  ])("rejects unresolved or duplicate dependencies before import", (...steps) => {
    expect(parseConfigurationPack(JSON.stringify({ version: 1, workflow: { name: "Synthetic workflow", steps } }))).toHaveProperty("error")
  })
})
