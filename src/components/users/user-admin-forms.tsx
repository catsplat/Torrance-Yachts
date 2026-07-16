"use client"

import { useActionState } from "react"

import {
  inviteInternalUserAction,
  sendRecoveryEmailAction,
  updateInternalUserAction,
  type UserAdminActionState,
} from "@/app/(workspace)/settings/users/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Tables } from "@/types/database"

const initialState: UserAdminActionState = {}

function Feedback({ state }: { state: UserAdminActionState }) {
  if (!state.message) return null
  return <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p>
}

export function InviteUserForm() {
  const [state, action, pending] = useActionState(inviteInternalUserAction, initialState)
  return <form action={action} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><Input name="displayName" placeholder="Staff display name" required /><Input name="email" placeholder="staff@company.example" required type="email" /><Button disabled={pending} type="submit">Send invitation</Button><div className="md:col-span-3"><Feedback state={state} /></div></form>
}

export function UserAdministrationForm({ profile }: { profile: Tables<"profiles"> }) {
  const [state, action, pending] = useActionState(updateInternalUserAction, initialState)
  return <form action={action} className="grid gap-2">
    <input name="userId" type="hidden" value={profile.id} />
    <Input defaultValue={profile.display_name} name="displayName" required />
    <div className="grid gap-2 sm:grid-cols-2"><Input defaultValue={profile.phone ?? ""} name="phone" placeholder="Phone" /><Input defaultValue={profile.telegram_chat_id ?? ""} name="telegramChatId" placeholder="Telegram chat ID" /></div>
    <div className="grid gap-2 sm:grid-cols-2"><select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={profile.role} name="role"><option value="administrator">Administrator</option><option value="staff">Staff</option></select><select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={profile.active ? "true" : "false"} name="active"><option value="true">Active</option><option value="false">Inactive</option></select></div>
    <Input name="reason" placeholder="Reason for account change" required />
    <Button disabled={pending} type="submit" variant="outline">Save account</Button>
    <Feedback state={state} />
  </form>
}

export function RecoveryEmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(sendRecoveryEmailAction, initialState)
  return <form action={action} className="mt-3 grid gap-2"><input name="email" type="hidden" value={email} /><Input name="reason" placeholder="Reason for recovery request" required /><Button disabled={pending} type="submit" variant="ghost">Send recovery email</Button><Feedback state={state} /></form>
}
