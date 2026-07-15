"use client"

import { useActionState } from "react"

import { loginAction, type LoginState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: LoginState = {}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState)

  return (
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
  )
}
