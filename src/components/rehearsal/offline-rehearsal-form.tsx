"use client"

import Link from "next/link"
import { useActionState } from "react"

import {
  createOfflineRehearsalEmailAction,
  createOfflineRehearsalSuiteAction,
  createFullCharterRehearsalAction,
  advanceFullCharterRehearsalAction,
  completeFullCharterRehearsalAction,
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

type ActiveRehearsalRun = { created_at: string; id: string; label: string }

export function OfflineRehearsalForm({ activeRuns, enabled }: { activeRuns: ActiveRehearsalRun[]; enabled: boolean }) {
  const [state, action, pending] = useActionState(createOfflineRehearsalEmailAction, initialState)
  const [suiteState, suiteAction, suitePending] = useActionState(createOfflineRehearsalSuiteAction, initialState)
  const [fullState, fullAction, fullPending] = useActionState(createFullCharterRehearsalAction, initialState)
  const [advanceState, advanceAction, advancePending] = useActionState(advanceFullCharterRehearsalAction, initialState)
  const [completeState, completeAction, completePending] = useActionState(completeFullCharterRehearsalAction, initialState)
  const [resetState, resetAction, resetPending] = useActionState(resetOfflineRehearsalAction, initialState)
  const transientRunIds = [fullState.runId, suiteState.runId, state.runId].filter((runId): runId is string => Boolean(runId))
  const resetRuns = [...activeRuns]
  for (const runId of transientRunIds) {
    if (!resetRuns.some((run) => run.id === runId)) resetRuns.unshift({ created_at: "", id: runId, label: "Current fictional rehearsal" })
  }
  const fullRunId = fullState.runId ?? activeRuns.find((run) => run.label === "Full fictional charter rehearsal")?.id

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

      {resetRuns.length ? (
        <div className="space-y-3 border-t pt-5">
          <p className="text-sm font-medium">Active fictional rehearsals</p>
          {resetRuns.map((run) => <form action={resetAction} className="rounded-lg border p-4" key={run.id}>
          <input name="runId" type="hidden" value={run.id} />
          <p className="text-sm font-medium">{run.label}</p>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">
            Removes this completed fictional run only. Its audit evidence remains; real operational records are never included.
          </p>
          <Button disabled={resetPending} type="submit" variant="destructive">
            {resetPending ? "Removing fictional run…" : "Remove this fictional run"}
          </Button>
          </form>)}
        </div>
      ) : null}
      <ActionFeedback state={resetState} />

      <div className="border-t pt-5">
        <form action={fullAction} className="space-y-3">
          <p className="text-sm font-medium">Full charter rehearsal</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Creates a separate fictional yacht and drives the genuine enquiry, offer, booking, availability-buffer, checklist, and task-engine commands. The optional local extension then rehearses compliance documents, contract review, instalments, and commission. Messages and post-charter lifecycle actions remain deliberately human-controlled.
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
        {fullRunId ? <form action={advanceAction} className="mt-4 border-t pt-4">
            <input name="runId" type="hidden" value={fullRunId} />
            <p className="mb-3 text-xs leading-5 text-muted-foreground">Next, rehearse the fictional KYC, passport, CDD, signed agreement, malware-quarantine, contract-review, payment-schedule, and commission boundaries. This is still local only.</p>
            <Button disabled={advancePending} type="submit" variant="outline">{advancePending ? "Advancing fictional contract rehearsal…" : "Rehearse compliance and contract review"}</Button>
            <ActionFeedback state={advanceState} />
            {advanceState.bookingId ? <Link className="mt-3 inline-flex text-sm font-medium text-primary underline" href={`/bookings/${advanceState.bookingId}/documents`}>Open fictional document workspace</Link> : null}
        </form> : null}
        {fullRunId ? <form action={completeAction} className="mt-4 border-t pt-4">
            <input name="runId" type="hidden" value={fullRunId} />
            <p className="mb-3 text-xs leading-5 text-muted-foreground">Finally, rehearse fictional invoice evidence, Yachtfolio confirmation, captain and broker hand-offs, payment settlement, charter start/end, and post-charter follow-up. The action is blocked until contract review is approved and never contacts a provider or recipient.</p>
            <Button disabled={completePending} type="submit" variant="outline">{completePending ? "Completing fictional charter lifecycle…" : "Rehearse post-contract charter lifecycle"}</Button>
            <ActionFeedback state={completeState} />
            {completeState.bookingId ? <Link className="mt-3 inline-flex text-sm font-medium text-primary underline" href={`/bookings/${completeState.bookingId}`}>Open completed fictional booking</Link> : null}
        </form> : null}
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
