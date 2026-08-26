import { redirect } from "next/navigation"
import type { Metadata } from "next"

import { ConfigurationPackForm } from "@/components/settings/configuration-pack-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "Configuration pack" }

export default async function ConfigurationPackPage() {
  const user = await getCurrentUser()
  if (user?.role !== "administrator") redirect("/settings")
  return <div className="mx-auto max-w-5xl space-y-5"><div><h1 className="text-3xl font-semibold">Configuration pack</h1><p className="mt-2 text-sm text-muted-foreground">Load yacht data, rates, captain assignments, draft wording, invoice details and a draft booking workflow in one reviewed operation.</p></div><Card><CardHeader className="border-b"><CardTitle>Import</CardTitle><CardDescription>Imports are additive. Existing bookings, tasks, documents and history are never deleted.</CardDescription></CardHeader><CardContent className="pt-5"><ConfigurationPackForm /></CardContent></Card></div>
}
