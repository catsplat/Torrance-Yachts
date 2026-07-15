"use client"

import { useActionState } from "react"

import {
  addEnquiryNoteAction,
  type EnquiryActionState,
} from "@/app/(workspace)/enquiries/actions"
import { Button } from "@/components/ui/button"
import { enquiryNoteKindLabels } from "@/lib/enquiries/options"
import { enquiryNoteKindValues } from "@/lib/enquiries/validation"

const initialState: EnquiryActionState = {}

export function EnquiryNoteForm({ enquiryId }: { enquiryId: string }) {
  const actionWithId = addEnquiryNoteAction.bind(null, enquiryId)
  const [state, action, pending] = useActionState(actionWithId, initialState)

  return (
    <form action={action} className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" htmlFor="note_kind">
            Note type
          </label>
          <select
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            id="note_kind"
            name="kind"
          >
            {enquiryNoteKindValues.map((kind) => (
              <option key={kind} value={kind}>
                {enquiryNoteKindLabels[kind]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium" htmlFor="note_body">
            Note
          </label>
          <textarea
            className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            id="note_body"
            maxLength={10000}
            name="body"
            required
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={state.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}
        >
          {state.message}
        </p>
        <Button disabled={pending} type="submit">
          {pending ? "Adding…" : "Add permanent note"}
        </Button>
      </div>
    </form>
  )
}
