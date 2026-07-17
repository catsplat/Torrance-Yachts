"use client"

import { useActionState } from "react"

import {
  createInitialAdministratorAction,
  type InitialAdministratorSetupState,
} from "@/app/setup/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: InitialAdministratorSetupState = {}

export function InitialAdministratorSetupForm() {
  const [state, action, pending] = useActionState(createInitialAdministratorAction, initialState)
  return (
    <form action={action} className="space-y-4">
      <Field autoComplete="name" label="Display name" name="displayName" required />
      <Field autoComplete="email" label="Work email" name="email" required type="email" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field autoComplete="new-password" label="Password" name="password" required type="password" />
        <Field autoComplete="new-password" label="Confirm password" name="confirmPassword" required type="password" />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Use at least 12 characters with upper- and lowercase letters, a number, and a symbol.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field autoComplete="tel" label="Phone (optional)" name="phone" />
        <Field label="Telegram chat ID (optional)" name="telegramChatId" />
      </div>
      <Field autoComplete="off" label="One-time setup token" name="setupToken" required type="password" />
      {state.message ? <p aria-live="polite" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">{state.message}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">{pending ? "Creating administrator…" : "Create administrator"}</Button>
    </form>
  )
}

function Field({ label, ...props }: React.ComponentProps<typeof Input> & { label: string }) {
  const id = `setup-${props.name}`
  return <div className="space-y-2"><label className="text-sm font-medium" htmlFor={id}>{label}</label><Input id={id} {...props} /></div>
}
