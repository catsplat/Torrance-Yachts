import { redirect } from "next/navigation"

import { signOutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function AccessPendingPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) redirect("/login")
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Access awaiting approval</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Your sign-in succeeded, but an administrator has not approved this account for the internal workspace.</p>
        <form action={signOutAction}><Button className="w-full" variant="outline">Sign out</Button></form>
      </CardContent>
    </Card>
  </main>
}
