"use client"

import { useActionState } from "react"

import { updatePasswordAction, type PasswordActionState } from "@/app/account/update-password/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: PasswordActionState = {}

export function PasswordUpdateForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState)
  return <form action={action} className="space-y-4"><label className="grid gap-1 text-sm">New password<Input autoComplete="new-password" name="password" required type="password" /></label><label className="grid gap-1 text-sm">Confirm password<Input autoComplete="new-password" name="confirmPassword" required type="password" /></label><p className="text-xs text-muted-foreground">Use at least 12 characters with upper/lowercase letters, a number, and a symbol.</p>{state.message ? <p aria-live="polite" className="text-sm text-destructive">{state.message}</p> : null}<Button className="w-full" disabled={pending} type="submit">{pending ? "Updating…" : "Update password"}</Button></form>
}
