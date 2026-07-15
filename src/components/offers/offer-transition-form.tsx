"use client"

import { useActionState } from "react"

import {
  approveOfferAction,
  markOfferSentAction,
  type OfferActionState,
} from "@/app/(workspace)/offers/actions"
import { Button } from "@/components/ui/button"

const initialState: OfferActionState = {}

export function OfferTransitionForm({ offerId, mode }: { offerId: string; mode: "approve" | "sent" }) {
  const actionFunction = mode === "approve" ? approveOfferAction : markOfferSentAction
  const [state, action, pending] = useActionState(actionFunction.bind(null, offerId), initialState)
  return <form action={action} className="space-y-3 rounded-xl border bg-muted/20 p-4">
    <div className="space-y-1.5"><label className="text-xs font-medium" htmlFor={`${mode}_reason`}>{mode === "approve" ? "Approval record" : "Sent record"}</label><textarea className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" id={`${mode}_reason`} maxLength={1000} name="reason" placeholder={mode === "approve" ? "Confirm what was checked before locking this offer" : "Record how and when you sent the approved offer"} required /></div>
    {mode === "sent" ? <p className="text-xs leading-5 text-muted-foreground">This records a completed human action. The application will not send an email.</p> : <p className="text-xs leading-5 text-muted-foreground">Approval locks this exact subject, body and commercial snapshot.</p>}
    <p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p>
    <Button className="w-full" disabled={pending} type="submit">{pending ? "Recording…" : mode === "approve" ? "Approve and lock offer" : "Record offer as sent"}</Button>
  </form>
}
