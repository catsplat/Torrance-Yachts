import { LockKeyhole, ShipWheel } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type LoginPageProps = {
  searchParams: Promise<{
    recovery?: string | string[]
    oauth?: string | string[]
    setup?: string | string[]
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const recovery = params.recovery
  const recoveryMessage = recovery === "complete"
    ? {
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        text: "Your password has been updated. Sign in with the new password.",
      }
    : recovery === "invalid"
      ? {
          className: "border-destructive/20 bg-destructive/5 text-destructive",
          text: "That recovery link is invalid or has expired. Ask an administrator to send a new one.",
        }
      : null
  const setupComplete = params.setup === "complete"
  const oauthMessage = params.oauth === "inactive"
    ? "This Google account is not approved for the private workspace. Ask an administrator for access."
    : params.oauth === "not-configured"
      ? "Google sign-in has not been enabled for this workspace yet."
      : params.oauth === "failed"
        ? "Google sign-in could not be completed. Ask an administrator to confirm your account has been invited, or use your password."
        : null

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_15%_20%,rgba(20,184,166,.24),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(14,116,144,.22),transparent_36%)]" />
      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_27rem]">
        <section className="hidden text-white lg:block">
          <div className="mb-8 flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-xl backdrop-blur">
            <ShipWheel aria-hidden="true" className="size-7" />
          </div>
          <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-teal-300 uppercase">
            Torrance Yachts
          </p>
          <p className="max-w-xl text-4xl leading-tight font-semibold tracking-tight">
            Charter operations
          </p>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-300">
            Enquiries, offers, bookings and charter tasks in one place.
          </p>
        </section>

        <Card className="border-white/10 shadow-2xl">
          <CardHeader className="space-y-4 pb-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
              <ShipWheel aria-hidden="true" className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl"><h1>Sign in</h1></CardTitle>
              <CardDescription className="mt-1.5 leading-6">
                Use your work account.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {setupComplete ? <p aria-live="polite" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900" role="status">Administrator created. Sign in with the account you just configured, then remove the setup token from the deployment environment.</p> : null}
            {recoveryMessage ? (
              <p
                aria-live="polite"
                className={`mb-5 rounded-lg border px-3 py-2.5 text-sm ${recoveryMessage.className}`}
                role="status"
              >
                {recoveryMessage.text}
              </p>
            ) : null}
            {oauthMessage ? <p aria-live="polite" className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">{oauthMessage}</p> : null}
            <LoginForm googleEnabled={process.env.GOOGLE_SIGN_IN_ENABLED === "true"} />
            <div className="mt-6 flex gap-2 border-t pt-5 text-xs leading-5 text-muted-foreground">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <p>Need access or a password reset? Contact your administrator.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
