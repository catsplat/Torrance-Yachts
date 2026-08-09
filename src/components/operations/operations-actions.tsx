"use client"

import { useActionState } from "react"

import {
  type OperationsActionState,
  reconcileQuarantineAction,
} from "@/app/(workspace)/settings/operations/actions"
import { Button } from "@/components/ui/button"

export function QuarantineReconciliationForm() {
  const [state, action, pending] = useActionState<OperationsActionState, FormData>(
    reconcileQuarantineAction,
    {},
  )
  return <form action={action} className="space-y-2">
    <Button disabled={pending} type="submit" variant="outline">
      {pending ? "Reconciling…" : "Reconcile quarantine storage"}
    </Button>
    {state.message ? <p aria-live="polite" className="text-sm text-muted-foreground">{state.message}</p> : null}
  </form>
}
