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
    {mode === "approve" ? <p className="text-xs leading-5 text-muted-foreground">Approval locks this version.</p> : null}
    <p aria-live="polite" className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{state.message}</p>
    <Button className="w-full" disabled={pending} type="submit">{pending ? "Saving…" : mode === "approve" ? "Approve offer" : "Mark as sent"}</Button>
  </form>
}
