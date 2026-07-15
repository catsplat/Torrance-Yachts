"use client"

import { useActionState } from "react"

import {
  transitionEnquiryAction,
  type EnquiryActionState,
} from "@/app/(workspace)/enquiries/actions"
import { Button } from "@/components/ui/button"
import { enquiryStatusLabels } from "@/lib/enquiries/options"
import type { Enums } from "@/types/database"

const initialState: EnquiryActionState = {}

export function EnquiryTransitionForm({
  currentStatus,
  enquiryId,
  targets,
}: {
  currentStatus: Enums<"enquiry_status">
  enquiryId: string
  targets: Enums<"enquiry_status">[]
}) {
  const actionWithContext = transitionEnquiryAction.bind(
    null,
    enquiryId,
    currentStatus,
  )
  const [state, action, pending] = useActionState(actionWithContext, initialState)

  if (!targets.length) {
    return (
      <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No manual transitions are available from this state.
      </p>
    )
  }

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium" htmlFor="new_status">
          Move to
        </label>
        <select
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          id="new_status"
          name="new_status"
        >
          {targets.map((target) => (
            <option key={target} value={target}>
              {enquiryStatusLabels[target]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium" htmlFor="transition_reason">
          Reason
        </label>
        <textarea
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          id="transition_reason"
          maxLength={1000}
          name="reason"
          placeholder="Record why the operational state is changing"
          required
        />
      </div>
      <p
        aria-live="polite"
        className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}
      >
        {state.message}
      </p>
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Recording…" : "Record status change"}
      </Button>
    </form>
  )
}
