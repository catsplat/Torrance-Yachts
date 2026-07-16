import { KeyRound, UserPlus, UsersRound } from "lucide-react"

import { InviteUserForm, RecoveryEmailForm, UserAdministrationForm } from "@/components/users/user-admin-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { createClient } from "@/lib/supabase/server"

export default async function UserSettingsPage() {
  const supabase = await createClient()
  const [user, profiles] = await Promise.all([
    getCurrentUser(),
    supabase.from("profiles").select("*").order("active", { ascending: false }).order("display_name"),
  ])
  if (profiles.error) throw new Error("Unable to load internal users.")
  const administrator = user?.role === "administrator"
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Identity and recovery</p><h1 className="mt-1 text-3xl font-semibold">Internal users</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Use individual accounts for auditability. Invitations and recovery emails require reviewed production SMTP configuration.</p></div>
    {administrator ? <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><UserPlus className="size-5 text-primary" />Invite staff member</CardTitle><CardDescription>Public registration remains disabled. An administrator initiates every invitation.</CardDescription></CardHeader><CardContent className="pt-5"><InviteUserForm /></CardContent></Card> : null}
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><UsersRound className="size-5 text-primary" />Account register</CardTitle><CardDescription>Administrators cannot remove their own recovery access or leave the platform without an active administrator.</CardDescription></CardHeader><CardContent className="divide-y p-0">{profiles.data.map((profile) => <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(21rem,.8fr)]" key={profile.id}><div><p className="font-medium">{profile.display_name}</p><p className="mt-1 text-sm text-muted-foreground">{profile.email}</p><p className="mt-2 text-xs text-muted-foreground">{profile.phone ?? "No phone"} · {profile.telegram_chat_id ? "Telegram configured" : "No Telegram ID"}</p></div><div className="flex flex-col items-start gap-2"><Badge>{profile.role}</Badge><Badge variant="outline">{profile.active ? "active" : "inactive"}</Badge></div>{administrator ? <div><UserAdministrationForm profile={profile} /><div className="mt-4 border-t pt-3"><p className="flex items-center gap-2 text-xs font-medium"><KeyRound className="size-3.5" />Account recovery</p><RecoveryEmailForm email={profile.email} /></div></div> : <p className="text-sm text-muted-foreground">Administrator access required.</p>}</div>)}</CardContent></Card>
  </div>
}
