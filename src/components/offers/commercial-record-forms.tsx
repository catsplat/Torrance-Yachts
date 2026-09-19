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
    <Field htmlFor="rate_name" label="Rate name" error={state.fieldErrors?.name?.[0]}><Input id="rate_name" name="name" required /></Field>
    <Field htmlFor="rate_valid_from" label="From" error={state.fieldErrors?.valid_from?.[0]}><Input id="rate_valid_from" name="valid_from" type="date" required /></Field>
    <Field htmlFor="rate_valid_to" label="To" error={state.fieldErrors?.valid_to?.[0]}><Input id="rate_valid_to" name="valid_to" type="date" required /></Field>
    <Field htmlFor="weekly_rate" label="Weekly rate" error={state.fieldErrors?.weekly_rate?.[0]}><Input id="weekly_rate" min="0.01" name="weekly_rate" step="0.01" type="number" required /></Field>
    <Field htmlFor="rate_currency" label="Currency" error={state.fieldErrors?.currency?.[0]}><Input defaultValue={currency} id="rate_currency" maxLength={3} name="currency" required /></Field>
    <Field htmlFor="rate_tax_rate" label="Tax rate (%)" error={state.fieldErrors?.tax_rate?.[0]}><Input defaultValue={taxRate} id="rate_tax_rate" min="0" max="100" name="tax_rate" step="0.01" type="number" required /></Field>
    <div className="flex items-end justify-between gap-3 sm:col-span-2 lg:col-span-3"><p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Adding…" : "Add rate period"}</Button></div>
  </form>
}

export function SalesMaterialForm({ yachtId }: { yachtId: string }) {
  const [state, action, pending] = useActionState(createSalesMaterialAction.bind(null, yachtId), initialState)
  return <form action={action} className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
    <input name="yacht_id" type="hidden" value={yachtId} />
    <Field htmlFor="material_type" label="Material type" error={state.fieldErrors?.material_type?.[0]}><select className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" id="material_type" name="material_type">{salesMaterialTypeValues.map((value) => <option key={value} value={value}>{salesMaterialTypeLabels[value]}</option>)}</select></Field>
    <Field htmlFor="material_label" label="Label" error={state.fieldErrors?.label?.[0]}><Input id="material_label" name="label" required /></Field>
    <Field htmlFor="material_public_url" label="HTTPS public link" error={state.fieldErrors?.public_url?.[0]}><Input id="material_public_url" name="public_url" placeholder="https://…" type="url" required /></Field>
    <Field htmlFor="material_sort_order" label="Sort order" error={state.fieldErrors?.sort_order?.[0]}><Input defaultValue={0} id="material_sort_order" min="0" max="1000" name="sort_order" type="number" required /></Field>
    <label className="flex items-center gap-2 text-sm sm:col-span-2"><input name="approved_for_offers" type="checkbox" />Approved for inclusion in offer drafts</label>
    <div className="flex items-center justify-between gap-3 sm:col-span-2"><p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Adding…" : "Add sales material"}</Button></div>
  </form>
}

export function OfferTemplateForm({ yachtId }: { yachtId: string }) {
  const [state, action, pending] = useActionState(createOfferTemplateAction.bind(null, yachtId), initialState)
  return <form action={action} className="space-y-3 rounded-xl border bg-muted/20 p-4">
    <input name="yacht_id" type="hidden" value={yachtId} />
    <Field htmlFor="template_name" label="Template name" error={state.fieldErrors?.name?.[0]}><Input id="template_name" name="name" required /></Field>
    <Field htmlFor="subject_template" label="Subject (optional)" error={state.fieldErrors?.subject_template?.[0]}><Input id="subject_template" name="subject_template" maxLength={300} placeholder="Use the existing conversation subject" /></Field>
    <Field htmlFor="body_template" label="Plain-text body template" error={state.fieldErrors?.body_template?.[0]}><textarea className="min-h-64 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" id="body_template" name="body_template" required /></Field>
    <p className="text-xs leading-5 text-muted-foreground">Allowed placeholders: {offerTemplatePlaceholderValues.map((value) => `{{${value}}}`).join(", ")}</p>
    <div className="flex items-center justify-between gap-3"><p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p><Button disabled={pending} type="submit">{pending ? "Creating…" : "Create template draft"}</Button></div>
  </form>
}

function Field({ htmlFor, label, error, children }: { htmlFor: string; label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-medium" htmlFor={htmlFor}>{label}</label>{children}{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>
}
