"use server"

import { createClient } from "@/lib/supabase/server"

type Factor = { id: string; friendly_name?: string; status: string }

export async function listMfaFactorsAction(): Promise<
  | { ok: true; factors: Factor[] }
  | { ok: false; message: string }
> {
  const supabase = await createClient()
  const listed = await supabase.auth.mfa.listFactors()
  if (listed.error) return { ok: false, message: listed.error.message }
  return { ok: true, factors: listed.data.all }
}

export async function enrollMfaAction(): Promise<
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; message: string }
> {
  const supabase = await createClient()
  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Torrance Yachts",
  })
  if (enrolled.error) return { ok: false, message: enrolled.error.message }
  return {
    ok: true,
    factorId: enrolled.data.id,
    qrCode: enrolled.data.totp.qr_code,
    secret: enrolled.data.totp.secret,
  }
}

export async function unenrollMfaAction(factorId: string) {
  const supabase = await createClient()
  const result = await supabase.auth.mfa.unenroll({ factorId })
  return result.error ? { ok: false as const, message: result.error.message } : { ok: true as const }
}

export async function verifyMfaAction(factorId: string, code: string) {
  if (!/^\d{6}$/.test(code)) return { ok: false as const, message: "Enter a six-digit code." }
  const supabase = await createClient()
  const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  return result.error ? { ok: false as const, message: result.error.message } : { ok: true as const }
}
