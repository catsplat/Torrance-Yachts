import { ArrowLeft, CheckCircle2, ExternalLink, FileText, History, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import {
  approveOfferTemplateAction,
  setRatePeriodActiveAction,
  setSalesMaterialStateAction,
} from "@/app/(workspace)/offers/actions"
import { CommercialProfileForm } from "@/components/offers/commercial-profile-form"
import { OfferTemplateForm, RatePeriodForm, SalesMaterialForm } from "@/components/offers/commercial-record-forms"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { offerTemplateStatusLabels, salesMaterialTypeLabels } from "@/lib/offers/options"
import { formatCommercialNumber } from "@/lib/offers/pricing"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type CommercialPageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }

export default async function YachtCommercialPage({ params }: CommercialPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: yacht }, { data: profile }, { data: rates }, { data: materials }, { data: templates }] = await Promise.all([
    supabase.from("yachts").select("*").eq("id", id).single(),
    supabase.from("yacht_commercial_profiles").select("*").eq("yacht_id", id).maybeSingle(),
    supabase.from("yacht_rate_periods").select("*").eq("yacht_id", id).order("valid_from"),
    supabase.from("yacht_sales_materials").select("*").eq("yacht_id", id).order("sort_order"),
    supabase.from("yacht_offer_templates").select("*").eq("yacht_id", id).order("version_number", { ascending: false }),
  ])
  if (!yacht) notFound()

  const { count: auditCount } = await supabase.from("audit_events").select("id", { count: "exact", head: true })
    .in("entity_type", ["yacht_commercial_profile", "yacht_rate_period", "yacht_sales_material", "yacht_offer_template"])

  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href={`/yachts/${id}`}><ArrowLeft className="size-4" aria-hidden="true" />Back to {yacht.name}</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight">Commercial details</h1></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-2 text-xs text-muted-foreground"><History className="size-4" aria-hidden="true" />{auditCount ?? 0} changes</div><Link className={cn(buttonVariants())} href={`/offers/new`}><FileText aria-hidden="true" />Prepare offer</Link></div>
    </div>

    <Card><CardHeader className="border-b"><CardTitle>Profile</CardTitle></CardHeader><CardContent className="pt-5"><CommercialProfileForm profile={profile} yachtId={id} /></CardContent></Card>

    <Card><CardHeader className="border-b"><CardTitle>Dated weekly rates</CardTitle><CardDescription>Active periods cannot overlap. Deactivate an old period before adding a replacement.</CardDescription></CardHeader><CardContent className="space-y-4 pt-5"><div className="divide-y rounded-xl border">{rates?.length ? rates.map((rate) => <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={rate.id}><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{rate.name}</p><Badge variant={rate.active ? "default" : "outline"}>{rate.active ? "Active" : "Inactive"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{rate.valid_from} to {rate.valid_to} · {formatCommercialNumber(rate.weekly_rate)} {rate.currency} · {rate.tax_rate}% tax</p></div><form action={setRatePeriodActiveAction.bind(null, id, rate.id, !rate.active)}><Button size="sm" type="submit" variant="outline">{rate.active ? "Deactivate" : "Reactivate"}</Button></form></div>) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No rate periods configured.</p>}</div><RatePeriodForm currency={profile?.default_currency ?? "EUR"} taxRate={profile?.default_tax_rate ?? 0} yachtId={id} /></CardContent></Card>

    <Card><CardHeader className="border-b"><CardTitle>Sales materials</CardTitle></CardHeader><CardContent className="space-y-4 pt-5"><div className="divide-y rounded-xl border">{materials?.length ? materials.map((material) => <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={material.id}><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{material.label}</p><Badge variant="secondary">{salesMaterialTypeLabels[material.material_type]}</Badge>{material.approved_for_offers && material.active ? <Badge><CheckCircle2 aria-hidden="true" />Approved</Badge> : <Badge variant="outline">Excluded</Badge>}</div><a className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" href={material.public_url} rel="noreferrer" target="_blank">{material.public_url}<ExternalLink className="size-3" aria-hidden="true" /></a></div><div className="flex gap-2"><form action={setSalesMaterialStateAction.bind(null, id, material.id, material.active, !material.approved_for_offers)}><Button size="sm" type="submit" variant="outline">{material.approved_for_offers ? "Exclude" : "Approve"}</Button></form><form action={setSalesMaterialStateAction.bind(null, id, material.id, !material.active, material.approved_for_offers)}><Button size="sm" type="submit" variant="outline">{material.active ? "Deactivate" : "Reactivate"}</Button></form></div></div>) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No sales materials configured.</p>}</div><SalesMaterialForm yachtId={id} /></CardContent></Card>

    <Card><CardHeader className="border-b"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><ShieldCheck className="size-4" aria-hidden="true" /></div><div><CardTitle>Versioned offer templates</CardTitle><CardDescription className="mt-1">Only the one approved version can create new offer drafts. Approval retires the previous version without rewriting history.</CardDescription></div></div></CardHeader><CardContent className="space-y-4 pt-5"><div className="grid gap-3 md:grid-cols-2">{templates?.length ? templates.map((template) => <div className="rounded-xl border p-4" key={template.id}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">v{template.version_number} · {template.name}</p><p className="mt-1 text-xs text-muted-foreground">{template.subject_template}</p></div><Badge variant={template.status === "approved" ? "default" : "outline"}>{offerTemplateStatusLabels[template.status]}</Badge></div><details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Preview plain text</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-5">{template.body_template}</pre></details>{template.status === "draft" ? <form action={approveOfferTemplateAction.bind(null, id, template.id)} className="mt-3"><Button className="w-full" size="sm" type="submit"><CheckCircle2 aria-hidden="true" />Approve this version</Button></form> : null}</div>) : <div className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground md:col-span-2">No template versions configured.</div>}</div><OfferTemplateForm yachtId={id} /></CardContent></Card>
  </div>
}
