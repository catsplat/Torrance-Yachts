"use client"

import { useActionState } from "react"

import { saveCommercialProfileAction, type OfferActionState } from "@/app/(workspace)/offers/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Tables } from "@/types/database"

const initialState: OfferActionState = {}

export function CommercialProfileForm({
  yachtId,
  profile,
}: {
  yachtId: string
  profile: Tables<"yacht_commercial_profiles"> | null
}) {
  const actionWithYacht = saveCommercialProfileAction.bind(null, yachtId)
  const [state, action, pending] = useActionState(actionWithYacht, initialState)

  return (
    <form action={action} className="space-y-4">
      <Field label="Commercial overview" error={state.fieldErrors?.overview?.[0]}>
        <textarea className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={profile?.overview ?? ""} id="overview" maxLength={10000} name="overview" required />
      </Field>
      <Field label="Port guidance" error={state.fieldErrors?.port_guidance?.[0]}>
        <textarea className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={profile?.port_guidance ?? ""} id="port_guidance" maxLength={5000} name="port_guidance" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Fuel consumption (L/hr)" error={state.fieldErrors?.fuel_consumption_lph?.[0]}><Input defaultValue={profile?.fuel_consumption_lph ?? ""} id="fuel_consumption_lph" min="0.01" name="fuel_consumption_lph" step="0.01" type="number" /></Field>
        <Field label="At speed (knots)" error={state.fieldErrors?.fuel_consumption_speed_knots?.[0]}><Input defaultValue={profile?.fuel_consumption_speed_knots ?? ""} id="fuel_consumption_speed_knots" min="0.01" name="fuel_consumption_speed_knots" step="0.01" type="number" /></Field>
        <Field label="Short-charter divisor" error={state.fieldErrors?.short_charter_divisor?.[0]}><Input defaultValue={profile?.short_charter_divisor ?? 6} id="short_charter_divisor" min="1" name="short_charter_divisor" step="0.01" type="number" required /></Field>
        <Field label="Default currency" error={state.fieldErrors?.default_currency?.[0]}><Input defaultValue={profile?.default_currency ?? "EUR"} id="default_currency" maxLength={3} name="default_currency" required /></Field>
      </div>
      <Field label="Default tax rate (%)" error={state.fieldErrors?.default_tax_rate?.[0]}>
        <Input className="max-w-48" defaultValue={profile?.default_tax_rate ?? 0} id="default_tax_rate" min="0" max="100" name="default_tax_rate" step="0.01" type="number" required />
      </Field>
      <Field label="Key features — one per line" error={state.fieldErrors?.key_features?.[0]}>
        <textarea className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={profile?.key_features.join("\n") ?? ""} id="key_features" maxLength={10000} name="key_features" />
      </Field>
      <Field label="Approved reference wording" error={state.fieldErrors?.reference_notes?.[0]}>
        <textarea className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={profile?.reference_notes ?? ""} id="reference_notes" maxLength={10000} name="reference_notes" />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p>
        <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save commercial profile"}</Button>
      </div>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium">{label}</label>{children}{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>
}
