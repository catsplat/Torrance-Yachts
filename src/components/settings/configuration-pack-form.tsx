"use client"

import { useActionState, useState } from "react"

import { importConfigurationPackAction, previewConfigurationPackAction, type ConfigurationPackActionState } from "@/app/(workspace)/settings/configuration-pack/actions"
import { Button } from "@/components/ui/button"

const initialState: ConfigurationPackActionState = {}
const starter = JSON.stringify({
  version: 1,
  yachts: [{ name: "Yacht name", rates: [{ name: "Season", valid_from: "2026-05-01", valid_to: "2026-09-30", weekly_rate: 100000, currency: "EUR", tax_rate: 0 }], commercial_profile: { overview: "Describe the yacht for approved offer drafts." } }],
  contacts: [{ full_name: "Captain name", roles: ["captain"], yacht_assignments: [{ yacht_name: "Yacht name", responsibility: "captain", is_primary: true, notifications_enabled: true }] }],
  communication_templates: [{ kind: "kyc_request", name: "KYC request", subject: "", body: "Dear {{broker_company_name}},\n\n[Paste the approved wording here.]" }],
  workflow: {
    name: "Booking workflow", description: "Review and publish when the operating team approves it.", steps: [
      { code: "0.0", title: "Start booking task sequence", due_anchor: "booking_confirmed", required: true, auto_complete_on_generation: true },
      { code: "0.A", title: "Request KYC statement and client passport", after: ["0.0"], due_anchor: "booking_confirmed", due_date_required: true, priority: "high" },
      { code: "0.B", title: "Upload KYC, passport and CDD check", after: ["0.A"], priority: "high" },
      { code: "1.A", title: "Upload fully signed contract", after: ["0.B"], priority: "high" },
      { code: "1.B", title: "Review signed-contract data", after: ["1.A"], priority: "high" },
      { code: "1.C", title: "Prepare commission invoice draft", after: ["1.A"], priority: "high" },
      { code: "1.D", title: "Upload commission invoice", after: ["1.C"] },
      { code: "1.E", title: "Update Yachtfolio booking", after: ["1.A"], external_action: "yachtfolio_booking", priority: "high" },
      { code: "2.A", title: "Prepare captain contact draft", after: ["1.A"] },
      { code: "2.B", title: "Notify captain of booking", after: ["2.A"] },
      { code: "3", title: "First instalment due", after: ["1.B"], due_anchor: "contract_payment_1", priority: "high" },
      { code: "4.A", title: "Second instalment due", after: ["1.B"], due_anchor: "contract_payment_2", priority: "high" },
      { code: "4.B", title: "Third instalment due", after: ["1.B"], due_anchor: "contract_payment_3", required: false, priority: "high" },
      { code: "5", title: "Start of charter", after: ["1.B"], due_anchor: "charter_start", priority: "high" },
      { code: "6", title: "End of charter", after: ["5"], due_anchor: "charter_end", priority: "high" },
      { code: "7", title: "Broker follow-up and commission invoice", after: ["6"], due_anchor: "charter_end", due_offset_days: 2 },
    ],
  },
}, null, 2)

function Feedback({ state }: { state: ConfigurationPackActionState }) {
  return state.message ? <p aria-live="polite" className={state.success ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-destructive"}>{state.message}</p> : null
}

export function ConfigurationPackForm() {
  const [value, setValue] = useState(starter)
  const [previewState, previewAction, previewPending] = useActionState(previewConfigurationPackAction, initialState)
  const [importState, importAction, importPending] = useActionState(importConfigurationPackAction, initialState)
  const preview = previewState.preview ?? importState.preview
  return <div className="space-y-4"><p className="text-sm text-muted-foreground">Paste a version 1 JSON pack. It can set yachts, rates, captain assignments, draft wording, invoice details and a booking workflow in one reviewed import. Use named placeholders such as <code>{"{{client_name}}"}</code>; the preview rejects unknown names. A blank template subject means “reply in the existing thread”. Values stay in the protected operational database and are never written to Git.</p><textarea aria-label="Configuration pack" className="min-h-[30rem] w-full rounded-lg border bg-background p-3 font-mono text-xs leading-5" onChange={(event) => setValue(event.target.value)} value={value} />
    <div className="flex flex-wrap gap-3"><form action={previewAction}><input name="pack" type="hidden" value={value} /><Button disabled={previewPending} type="submit" variant="outline">{previewPending ? "Checking…" : "Preview"}</Button></form><form action={importAction}><input name="pack" type="hidden" value={value} /><Button disabled={importPending} type="submit">{importPending ? "Importing…" : "Import as drafts"}</Button></form></div>
    <Feedback state={previewState} /><Feedback state={importState} />
    {preview ? <dl className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2">{Object.entries(preview).filter(([, value]) => typeof value !== "object").map(([key, item]) => <div className="flex justify-between gap-4" key={key}><dt className="text-muted-foreground">{key.replaceAll("_", " ")}</dt><dd className="font-medium">{String(item)}</dd></div>)}</dl> : null}
  </div>
}
