import { redirect } from "next/navigation"

import { signOutAction } from "@/app/actions/auth"
import { MfaSetup } from "@/components/auth/mfa-setup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"

export default async function MfaPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.assuranceLevel === "aal2") redirect("/")
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle><h1>Secure your account</h1></CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <MfaSetup />
        <form action={signOutAction}><Button className="w-full" type="submit" variant="ghost">Sign out</Button></form>
      </CardContent>
    </Card>
  </main>
}
