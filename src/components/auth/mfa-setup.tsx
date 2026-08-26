"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { enrollMfaAction, listMfaFactorsAction, unenrollMfaAction, verifyMfaAction } from "@/app/account/mfa/actions"

type Factor = { id: string; friendly_name?: string; status: string }
type Enrolment = { factorId: string; qrCode: string; secret: string }

export function MfaSetup() {
  const started = useRef(false)
  const [factor, setFactor] = useState<Factor | null>(null)
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("Checking your account…")
  const [pending, setPending] = useState(true)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const supabase = createClient()
    void (async () => {
      const listed = await supabase.auth.mfa.listFactors()
      const serverListed = listed.error ? await listMfaFactorsAction() : null
      if (listed.error && !serverListed?.ok) {
        setMessage("Authenticator setup could not be loaded. Sign out and try again.")
        setPending(false)
        return
      }
      const allFactors = serverListed?.ok ? serverListed.factors : listed.data?.all ?? []
      const verified = allFactors.find((item) => item.status === "verified")
      if (verified) {
        setFactor(verified)
        setMessage("Enter the current code from your authenticator app.")
        setPending(false)
        return
      }
      for (const item of allFactors.filter((candidate) => candidate.status !== "verified")) {
        const removed = await supabase.auth.mfa.unenroll({ factorId: item.id })
        if (removed.error) await unenrollMfaAction(item.id)
      }
      const enrolled = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Torrance Yachts" })
      const serverEnrolled = enrolled.error ? await enrollMfaAction() : null
      if (enrolled.error && !serverEnrolled?.ok) {
        setMessage("Authenticator setup could not be started. Sign out and try again.")
        setPending(false)
        return
      }
      const setup = serverEnrolled?.ok
        ? serverEnrolled
        : enrolled.data
          ? { ok: true as const, factorId: enrolled.data.id, qrCode: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret }
          : null
      if (!setup) {
        setMessage("Authenticator setup could not be started. Sign out and try again.")
        setPending(false)
        return
      }
      setEnrolment({
        factorId: setup.factorId,
        qrCode: setup.qrCode,
        secret: setup.secret,
      })
      setMessage("Scan the QR code, then enter the six-digit code.")
      setPending(false)
    })()
  }, [])

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const factorId = factor?.id ?? enrolment?.factorId
    if (!factorId || !/^\d{6}$/.test(code)) {
      setMessage("Enter the six-digit code shown in your authenticator app.")
      return
    }
    setPending(true)
    const clientResult = await createClient().auth.mfa.challengeAndVerify({ factorId, code })
    const result = clientResult.error ? await verifyMfaAction(factorId, code) : { ok: true as const }
    if (!result.ok) {
      setMessage("That code was not accepted. Wait for a new code and try again.")
      setPending(false)
      return
    }
    window.location.assign("/")
  }

  return <div className="space-y-5">
    {enrolment ? <div className="grid justify-items-center gap-3 rounded-lg border bg-white p-4 text-slate-950">
      <Image alt="Authenticator setup QR code" height={220} src={enrolment.qrCode.trim()} unoptimized width={220} />
      <details className="w-full text-sm"><summary className="cursor-pointer font-medium">Enter a setup key instead</summary><code className="mt-2 block break-all rounded bg-slate-100 p-2">{enrolment.secret}</code></details>
    </div> : null}
    <p aria-live="polite" className="text-sm text-muted-foreground">{message}</p>
    <form className="space-y-3" onSubmit={verify}>
      <label className="grid gap-2 text-sm font-medium" htmlFor="mfa-code">Authenticator code
        <Input autoComplete="one-time-code" disabled={pending} id="mfa-code" inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} pattern="[0-9]{6}" required value={code} />
      </label>
      <Button className="w-full" disabled={pending || !factor && !enrolment} type="submit">{pending ? "Checking…" : enrolment ? "Finish setup" : "Continue"}</Button>
    </form>
  </div>
}
