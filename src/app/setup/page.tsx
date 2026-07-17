import { Anchor, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { connection } from "next/server"

import { InitialAdministratorSetupForm } from "@/components/auth/initial-administrator-setup-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getInitialAdministratorSetupStatus } from "@/lib/auth/initial-setup"

const unavailableMessages = {
  already_claimed: "Initial setup is complete. Public registration remains disabled.",
  not_configured: "Initial setup is disabled until the deployment operator configures a high-entropy one-time token.",
  unavailable: "Initial setup status cannot be verified. Check the trusted database configuration.",
}

export default async function InitialSetupPage() {
  await connection()
  const status = await getInitialAdministratorSetupStatus()
  const unavailableMessage = status.reason
    ? unavailableMessages[status.reason]
    : "Initial setup is ready."
  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-950 px-4 py-10">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="border-b">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Anchor className="size-5" /></div>
          <CardTitle className="text-2xl">Initial administrator setup</CardTitle>
          <CardDescription>This one-time route creates the first internal administrator. It closes automatically as soon as any account exists.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {status.available ? <InitialAdministratorSetupForm /> : <div className="space-y-4"><div className="flex gap-3 rounded-xl border bg-muted/40 p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-6">{unavailableMessage}</p></div><Link className="text-sm font-medium text-primary hover:underline" href="/login">Return to sign in</Link></div>}
        </CardContent>
      </Card>
    </main>
  )
}
