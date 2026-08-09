import { CheckCircle2, Circle, ExternalLink } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function BusinessReadinessPage() {
  const user = await getCurrentUser()
  if (user?.role !== "administrator") redirect("/settings")
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_business_readiness")
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Business readiness could not be calculated.")
  }
  const snapshot = data as Record<string, number | boolean>
  const sections = [
    { complete: Number(snapshot.companies) > 0, detail: "Company record", href: "/contacts/companies", title: "Company identity" },
    { complete: Number(snapshot.yachts) > 0 && Number(snapshot.primary_captains) >= Number(snapshot.yachts), detail: `${snapshot.yachts} yachts · ${snapshot.primary_captains} primary captains`, href: "/yachts", title: "Yachts and captains" },
    { complete: Number(snapshot.active_rates) > 0 && Number(snapshot.approved_offer_templates) > 0, detail: `${snapshot.active_rates} active rates · ${snapshot.approved_offer_templates} approved offer templates`, href: "/yachts", title: "Rates and offer rules" },
    { complete: Number(snapshot.approved_communication_templates) >= 3, detail: `${snapshot.approved_communication_templates} approved templates`, href: "/settings/communications", title: "Enquiry and KYC messages" },
    { complete: Number(snapshot.approved_invoice_profiles) > 0, detail: `${snapshot.approved_invoice_profiles} approved profile`, href: "/settings/invoices", title: "Invoice profile" },
    { complete: Boolean(snapshot.new_enquiry_timeout_days), detail: `${snapshot.new_enquiry_timeout_days} day new-enquiry window`, href: "/settings", title: "Enquiry timeouts" },
    { complete: Number(snapshot.approved_staff) > 0 && Number(snapshot.configured_alert_routes) > 0, detail: `${snapshot.approved_staff} approved staff · ${snapshot.configured_alert_routes} external alert routes`, href: "/settings/alerts", title: "Staff and alert routing" },
    { complete: Number(snapshot.connected_google_accounts) > 0, detail: `${snapshot.connected_google_accounts} connected accounts · ${snapshot.configured_google_destinations} mirror destinations`, href: "/settings/integrations", title: "Google account and destinations" },
    { complete: Number(snapshot.approved_task_templates) > 0, detail: `${snapshot.approved_task_templates} active workflow templates`, href: "/tasks/templates", title: "Booking workflow" },
    { complete: snapshot.document_policy_accepted === true, detail: snapshot.document_policy_accepted === true ? "Retention and scanning policy accepted" : "Client policy approval required", href: "/settings/launch", title: "Required document policy" },
  ]
  const complete = sections.filter((section) => section.complete).length
  return <div className="mx-auto max-w-5xl space-y-5"><div><h1 className="text-3xl font-semibold">Business setup</h1><p className="mt-2 text-sm text-muted-foreground">{complete} of {sections.length} sections ready.</p></div><Card><CardHeader className="border-b"><CardTitle>Configuration</CardTitle></CardHeader><CardContent className="divide-y p-0">{sections.map((section) => <Link className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40" href={section.href} key={section.title}>{section.complete ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Circle className="size-5 text-muted-foreground" />}<div className="min-w-0 flex-1"><p className="font-medium">{section.title}</p><p className="mt-1 text-sm text-muted-foreground">{section.detail}</p></div><Badge variant={section.complete ? "default" : "outline"}>{section.complete ? "Ready" : "Set up"}</Badge><ExternalLink className="size-4 text-muted-foreground" /></Link>)}</CardContent></Card><p className="text-xs text-muted-foreground">This report contains completion states only. Private values and credentials are never exported.</p></div>
}
