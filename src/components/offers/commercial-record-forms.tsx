"use client"

import { useActionState } from "react"

import {
  createOfferTemplateAction,
  createRatePeriodAction,
  createSalesMaterialAction,
  type OfferActionState,
} from "@/app/(workspace)/offers/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { salesMaterialTypeLabels } from "@/lib/offers/options"
import { offerTemplatePlaceholderValues } from "@/lib/offers/template"
import { salesMaterialTypeValues } from "@/lib/offers/validation"

const initialState: OfferActionState = {}

export function RatePeriodForm({ yachtId, currency, taxRate }: { yachtId: string; currency: string; taxRate: number }) {
  const [state, action, pending] = useActionState(createRatePeriodAction.bind(null, yachtId), initialState)
  return <form action={action} className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
    <input name="yacht_id" type="hidden" value={yachtId} />
    <Field label="Rate name" error={state.fieldErrors?.name?.[0]}><Input name="name" required /></Field>
    <Field label="From" error={state.fieldErrors?.valid_from?.[0]}><Input name="valid_from" type="date" required /></Field>
    <Field label="To" error={state.fieldErrors?.valid_to?.[0]}><Input name="valid_to" type="date" required /></Field>
    <Field label="Weekly rate" error={state.fieldErrors?.weekly_rate?.[0]}><Input min="0.01" name="weekly_rate" step="0.01" type="number" required /></Field>
    <Field label="Currency" error={state.fieldErrors?.currency?.[0]}><Input defaultValue={currency} maxLength={3} name="currency" required /></Field>
    <Field label="Tax rate (%)" error={state.fieldErrors?.tax_rate?.[0]}><Input defaultValue={taxRate} min="0" max="100" name="tax_rate" step="0.01" type="number" required /></Field>
    <div className="flex items-end justify-between gap-3 sm:col-span-2 lg:col-span-3"><p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Adding…" : "Add rate period"}</Button></div>
  </form>
}

export function SalesMaterialForm({ yachtId }: { yachtId: string }) {
  const [state, action, pending] = useActionState(createSalesMaterialAction.bind(null, yachtId), initialState)
  return <form action={action} className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
    <input name="yacht_id" type="hidden" value={yachtId} />
    <Field label="Material type" error={state.fieldErrors?.material_type?.[0]}><select className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" name="material_type">{salesMaterialTypeValues.map((value) => <option key={value} value={value}>{salesMaterialTypeLabels[value]}</option>)}</select></Field>
    <Field label="Label" error={state.fieldErrors?.label?.[0]}><Input name="label" required /></Field>
    <Field label="HTTPS public link" error={state.fieldErrors?.public_url?.[0]}><Input name="public_url" placeholder="https://…" type="url" required /></Field>
    <Field label="Sort order" error={state.fieldErrors?.sort_order?.[0]}><Input defaultValue={0} min="0" max="1000" name="sort_order" type="number" required /></Field>
    <label className="flex items-center gap-2 text-sm sm:col-span-2"><input name="approved_for_offers" type="checkbox" />Approved for inclusion in offer drafts</label>
    <div className="flex items-center justify-between gap-3 sm:col-span-2"><p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Adding…" : "Add sales material"}</Button></div>
  </form>
}

export function OfferTemplateForm({ yachtId }: { yachtId: string }) {
  const [state, action, pending] = useActionState(createOfferTemplateAction.bind(null, yachtId), initialState)
  return <form action={action} className="space-y-3 rounded-xl border bg-muted/20 p-4">
    <input name="yacht_id" type="hidden" value={yachtId} />
    <Field label="Template name" error={state.fieldErrors?.name?.[0]}><Input name="name" required /></Field>
    <Field label="Subject template" error={state.fieldErrors?.subject_template?.[0]}><Input name="subject_template" required /></Field>
    <Field label="Plain-text body template" error={state.fieldErrors?.body_template?.[0]}><textarea className="min-h-64 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" name="body_template" required /></Field>
    <p className="text-xs leading-5 text-muted-foreground">Allowed placeholders: {offerTemplatePlaceholderValues.map((value) => `{{${value}}}`).join(", ")}</p>
    <div className="flex items-center justify-between gap-3"><p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Creating…" : "Create template draft"}</Button></div>
  </form>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium">{label}</label>{children}{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>
}
