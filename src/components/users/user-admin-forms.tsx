"use client"

import { useActionState } from "react"

import {
  inviteInternalUserAction,
  resetUserMfaAction,
  sendRecoveryEmailAction,
  updateInternalUserAction,
  type UserAdminActionState,
} from "@/app/(workspace)/settings/users/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: UserAdminActionState = {}

function Feedback({ state }: { state: UserAdminActionState }) {
  if (!state.message) return null
  return <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p>
}

export function InviteUserForm() {
  const [state, action, pending] = useActionState(inviteInternalUserAction, initialState)
  return <form action={action} className="grid gap-4 md:grid-cols-2">
    <label className="grid gap-2 text-sm font-medium">Name<Input autoComplete="name" name="displayName" required /></label>
    <label className="grid gap-2 text-sm font-medium">Work email<Input autoComplete="email" name="email" required type="email" /></label>
    <div className="flex items-center gap-3 md:col-span-2"><Button disabled={pending} type="submit">{pending ? "Sending…" : "Send invitation"}</Button><Feedback state={state} /></div>
  </form>
}

type InternalUserAdministrationRecord = {
  active: boolean
  display_name: string
  id: string
  phone: string | null
  role: "administrator" | "staff"
  telegram_chat_id: string | null
}

export function UserAdministrationForm({ profile }: { profile: InternalUserAdministrationRecord }) {
  const [state, action, pending] = useActionState(updateInternalUserAction, initialState)
  return <form action={action} className="grid gap-2">
    <input name="userId" type="hidden" value={profile.id} />
    <Input defaultValue={profile.display_name} name="displayName" required />
    <div className="grid gap-2 sm:grid-cols-2"><Input defaultValue={profile.phone ?? ""} name="phone" placeholder="Phone" /><Input defaultValue={profile.telegram_chat_id ?? ""} name="telegramChatId" placeholder="Telegram chat ID" /></div>
    <div className="grid gap-2 sm:grid-cols-2"><select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={profile.role} name="role"><option value="administrator">Administrator</option><option value="staff">Staff</option></select><select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={profile.active ? "true" : "false"} name="active"><option value="true">Active</option><option value="false">Inactive</option></select></div>
    <Button disabled={pending} type="submit" variant="outline">Save account</Button>
    <Feedback state={state} />
  </form>
}

export function RecoveryEmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(sendRecoveryEmailAction, initialState)
  return <form action={action} className="mt-3 grid gap-2"><input name="email" type="hidden" value={email} /><Button disabled={pending} type="submit" variant="ghost">Send recovery email</Button><Feedback state={state} /></form>
}

export function ResetMfaForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetUserMfaAction, initialState)
  return <form action={action} className="mt-3 grid gap-2">
    <input name="userId" type="hidden" value={userId} />
    <label className="grid gap-1 text-xs font-medium">Reset reason<Input name="reason" required minLength={10} /></label>
    <Button disabled={pending} type="submit" variant="outline">Reset authenticator</Button>
    <Feedback state={state} />
  </form>
}
