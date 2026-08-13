import { KeyRound, UserPlus, UsersRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InviteUserForm, RecoveryEmailForm, ResetMfaForm, UserAdministrationForm,
} from "@/components/users/user-admin-forms"
import { getCurrentUser } from "@/lib/auth/current-user"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function UserSettingsPage() {
  const user = await getCurrentUser()
  if (user?.role !== "administrator") redirect("/settings")
  const supabase = await createClient()
  const profiles = await supabase.rpc("list_internal_user_administration_records")
  if (profiles.error) throw new Error("Unable to load internal users.")
  return <div className="mx-auto max-w-6xl space-y-5">
    <div><h1 className="text-3xl font-semibold">Users</h1></div>
    <Card>
      <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><UserPlus className="size-5 text-primary" />Invite staff member</CardTitle></CardHeader>
      <CardContent className="pt-5"><InviteUserForm /></CardContent>
    </Card>
    <Card>
      <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><UsersRound className="size-5 text-primary" />Accounts</CardTitle></CardHeader>
      <CardContent className="divide-y p-0">{profiles.data.map((profile) => <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(21rem,.8fr)]" key={profile.id}>
        <div><p className="font-medium">{profile.display_name}</p><p className="mt-1 text-sm text-muted-foreground">{profile.email}</p><p className="mt-2 text-xs text-muted-foreground">{profile.phone ?? "No phone"} · {profile.telegram_chat_id ? "Telegram connected" : "No Telegram"}</p></div>
        <div className="flex flex-col items-start gap-2"><Badge>{profile.role}</Badge><Badge variant="outline">{profile.active && profile.access_approved_at ? "active" : profile.access_approved_at ? "inactive" : "approval pending"}</Badge></div>
        <div><UserAdministrationForm profile={profile} /><div className="mt-4 border-t pt-3"><p className="flex items-center gap-2 text-xs font-medium"><KeyRound className="size-3.5" />Account recovery</p><RecoveryEmailForm email={profile.email} />{profile.id !== user.id ? <ResetMfaForm userId={profile.id} /> : null}</div></div>
      </div>)}</CardContent>
    </Card>
  </div>
}
