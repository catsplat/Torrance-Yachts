import { redirect } from "next/navigation"
import { z } from "zod"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"

type Props = { params: Promise<{ id: string }> }

export default async function ManualAccountSetupPage({ params }: Props) {
  const { id } = await params
  const parsedId = z.uuid().safeParse(id)
  if (!parsedId.success) redirect("/login?recovery=invalid")
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("get_manual_auth_link_status", { p_link_id: parsedId.data })
  const link = data?.[0]
  if (error || !link) redirect("/login?recovery=invalid")

  const isInvite = link.purpose === "invite"
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{isInvite ? "Set up your Torrance Yachts account" : "Reset your password"}</CardTitle>
          <CardDescription>
            {isInvite
              ? "Continue to securely open your account setup."
              : "Continue to securely choose a new password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">This one-time link expires at {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(link.expires_at))}.</p>
          <form action={`/auth/setup/${parsedId.data}/confirm`} method="post">
            <button className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
              {isInvite ? "Continue to account setup" : "Continue to password reset"}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
