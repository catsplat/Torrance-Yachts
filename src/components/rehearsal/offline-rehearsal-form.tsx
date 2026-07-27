"use client"

import Link from "next/link"
import { useActionState } from "react"

import {
  createOfflineRehearsalEmailAction,
  createOfflineRehearsalSuiteAction,
  createFullCharterRehearsalAction,
  resetOfflineRehearsalAction,
  type OfflineRehearsalActionState,
} from "@/app/(workspace)/settings/rehearsal/actions"
import { Button } from "@/components/ui/button"

const initialState: OfflineRehearsalActionState = {}

function ActionFeedback({ state }: { state: OfflineRehearsalActionState }) {
  if (!state.message) return null
  return (
    <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
      {state.message}
    </p>
  )
}

export function OfflineRehearsalForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(createOfflineRehearsalEmailAction, initialState)
  const [suiteState, suiteAction, suitePending] = useActionState(createOfflineRehearsalSuiteAction, initialState)
  const [fullState, fullAction, fullPending] = useActionState(createFullCharterRehearsalAction, initialState)
  const [resetState, resetAction, resetPending] = useActionState(resetOfflineRehearsalAction, initialState)
  const activeRunId = fullState.runId ?? suiteState.runId ?? state.runId

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">This control is disabled outside the local development environment.</p>
  }

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-3">
        <label className="grid max-w-sm gap-1 text-sm">
          Fictional email route
          <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue="new_enquiry" name="fixtureKind">
            <option value="new_enquiry">New enquiry — AI review</option>
            <option value="enquiry_follow_up">Enquiry follow-up — manual link</option>
            <option value="internal">Internal email — deterministic route</option>
            <option value="circular">Circular/newsletter — archive route</option>
            <option value="unknown">Unknown email — manual review</option>
          </select>
        </label>
        <Button disabled={pending} type="submit">
          {pending ? "Injecting and analysing…" : "Inject selected fictional email"}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          Creates a clearly labelled fictional inbox record through the same database command used by Gmail ingestion. It never contacts Gmail, Telegram, or a real recipient.
        </p>
        <ActionFeedback state={state} />
        {state.messageId ? (
          <Link className="inline-flex text-sm font-medium text-primary underline" href={`/emails/${state.messageId}`}>
            Open the synthetic email review
          </Link>
        ) : null}
      </form>

      {state.runId && state.fixtureKind ? (
        <form action={action}>
          <input name="fixtureKind" type="hidden" value={state.fixtureKind} />
          <input name="runId" type="hidden" value={state.runId} />
          <Button disabled={pending} type="submit" variant="outline">Replay the same provider event</Button>
        </form>
      ) : null}

      {activeRunId ? (
        <form action={resetAction} className="border-t pt-5">
          <input name="runId" type="hidden" value={activeRunId} />
          <p className="mb-3 text-xs leading-5 text-muted-foreground">
            Removes this completed fictional run only. Its audit evidence remains; real operational records are never included.
          </p>
          <Button disabled={resetPending} type="submit" variant="destructive">
            {resetPending ? "Removing fictional run…" : "Remove this fictional run"}
          </Button>
          <ActionFeedback state={resetState} />
        </form>
      ) : null}

      <div className="border-t pt-5">
        <form action={fullAction} className="space-y-3">
          <p className="text-sm font-medium">Full charter rehearsal</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Creates a separate fictional yacht and drives the genuine enquiry, offer, booking, availability-buffer, checklist, and task-engine commands. It stops before documents, payments, messages, and lifecycle actions so you can rehearse each human approval yourself.
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Prerequisite: an administrator must have approved the intended default workflow in <Link className="font-medium text-primary underline" href="/tasks/templates">Task templates</Link>. This deliberate approval prevents a draft process from generating operational work.
          </p>
          <Button disabled={fullPending} type="submit">
            {fullPending ? "Creating full fictional charter…" : "Create full charter rehearsal"}
          </Button>
          <ActionFeedback state={fullState} />
          {fullState.messageId ? (
            <Link className="inline-flex text-sm font-medium text-primary underline" href={`/bookings`}>
              Open the fictional booking
            </Link>
          ) : null}
        </form>
      </div>

      <div className="border-t pt-5">
        <form action={suiteAction} className="space-y-3">
          <p className="text-sm font-medium">Five-route verification suite</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Creates only fictional records: an administrator-approved harness enquiry plus its deterministic follow-up, internal, circular, and unknown inbox examples. It does not use AI to create an enquiry and does not contact a provider.
          </p>
          <Button disabled={suitePending} type="submit" variant="outline">
            {suitePending ? "Preparing fictional suite…" : "Create five-route rehearsal suite"}
          </Button>
          <ActionFeedback state={suiteState} />
          {suiteState.messageId ? (
            <Link className="inline-flex text-sm font-medium text-primary underline" href={`/emails/${suiteState.messageId}`}>
              Open the synthetic enquiry review
            </Link>
          ) : null}
        </form>
      </div>
    </div>
  )
}
