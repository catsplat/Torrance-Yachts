"use client"

import { useActionState } from "react"

import { googleLoginAction, loginAction, type LoginState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: LoginState = {}

export function LoginForm({
  desktopCompanion = false,
  googleEnabled,
}: {
  desktopCompanion?: boolean
  googleEnabled: boolean
}) {
  const [state, action, pending] = useActionState(loginAction, initialState)

  return (
    <>
      <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Work email
        </label>
        <Input
          autoComplete="username"
          autoFocus
          className="h-10"
          id="email"
          name="email"
          placeholder="name@company.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          autoComplete="current-password"
          className="h-10"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      </form>
      {googleEnabled && !desktopCompanion ? (
        <>
          <div className="relative py-1 text-center text-xs text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:border-t">
            <span className="relative bg-card px-2">or</span>
          </div>
          <form action={googleLoginAction}>
            <Button className="h-10 w-full" type="submit" variant="outline">
              Continue with Google
            </Button>
          </form>
        </>
      ) : desktopCompanion && googleEnabled ? (
        <p className="mt-5 border-t pt-5 text-xs leading-5 text-muted-foreground">
          Google sign-in is available in the browser. Use your password here.
        </p>
      ) : null}
    </>
  )
}
