import { Anchor, LockKeyhole, ShieldCheck, ShipWheel } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
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
          <h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight">
            Charter operations, kept private and under human control.
          </h1>
          <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <ShieldCheck className="mb-3 size-5 text-teal-300" aria-hidden="true" />
              <p className="text-sm font-medium">Internal access only</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Individual accounts preserve permissions and audit history.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <Anchor className="mb-3 size-5 text-teal-300" aria-hidden="true" />
              <p className="text-sm font-medium">One operational record</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Yachts and future booking workflows share one source of truth.
              </p>
            </div>
          </div>
        </section>

        <Card className="border-white/10 shadow-2xl">
          <CardHeader className="space-y-4 pb-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
              <ShipWheel aria-hidden="true" className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription className="mt-1.5 leading-6">
                Use your approved Torrance Yachts account. Public registration is disabled.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <div className="mt-6 flex gap-2 border-t pt-5 text-xs leading-5 text-muted-foreground">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <p>For access or password recovery, contact the internal administrator.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
