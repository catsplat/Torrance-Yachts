import { FileText, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { InvoiceProfileApprovalForm, InvoiceProfileForm } from "@/components/integrations/integration-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getInvoiceProfiles } from "@/lib/integrations/data"

export default async function InvoiceSettingsPage() {
  const [profiles, user] = await Promise.all([getInvoiceProfiles(), getCurrentUser()])
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link className="text-sm text-muted-foreground" href="/settings">← Back to Settings</Link>
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Private financial configuration</p><h1 className="mt-1 text-3xl font-semibold">Invoice profiles</h1><p className="mt-2 text-sm text-muted-foreground">Issuer, recipient, and payment details remain protected database content and never enter source control.</p></div>
      {user?.role === "administrator" ? <Card><CardHeader className="border-b"><CardTitle>Create draft profile</CardTitle><CardDescription>Every change creates a version that must be approved before PDF generation.</CardDescription></CardHeader><CardContent className="pt-5"><InvoiceProfileForm /></CardContent></Card> : null}
      <Card>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" />Profile versions</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {profiles.length ? profiles.map((profile) => (
            <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(18rem,.7fr)]" key={profile.id}>
              <div><p className="font-medium">{profile.profile_name} v{profile.version_number}</p><p className="mt-1 text-sm text-muted-foreground">{profile.issuer_name} → {profile.recipient_name}</p>{profile.status === "approved" ? <p className="mt-2 flex items-center gap-2 text-xs text-emerald-700"><ShieldCheck className="size-3" />Approved private configuration</p> : null}</div>
              <Badge variant={profile.status === "approved" ? "default" : "outline"}>{profile.status}</Badge>
              {profile.status === "draft" && user?.role === "administrator" ? <InvoiceProfileApprovalForm profileId={profile.id} /> : <p className="text-sm text-muted-foreground">Immutable after approval.</p>}
            </div>
          )) : <p className="p-5 text-sm text-muted-foreground">No invoice profile configured.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
