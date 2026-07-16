"use client"

import { useActionState } from "react"

import {
  advanceTutorialAction,
  recordBackupVerificationAction,
  resetTutorialAction,
  reviewLaunchCheckAction,
  type PhaseTwelveActionState,
} from "@/app/(workspace)/tutorial/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Enums } from "@/types/database"

const initialState: PhaseTwelveActionState = {}

function Feedback({ state }: { state: PhaseTwelveActionState }) {
  if (!state.message) return null
  return (
    <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
      {state.message}
    </p>
  )
}

export function TutorialAdvanceForm({
  eventType,
  label,
  practiceStage,
  step,
}: {
  eventType: string
  label: string
  practiceStage: Enums<"tutorial_practice_stage">
  step: number
}) {
  const [state, action, pending] = useActionState(advanceTutorialAction, initialState)
  return (
    <form action={action} className="space-y-2">
      <input name="eventType" type="hidden" value={eventType} />
      <input name="practiceStage" type="hidden" value={practiceStage} />
      <input name="step" type="hidden" value={step} />
      <Button disabled={pending} type="submit">{pending ? "Saving…" : label}</Button>
      <Feedback state={state} />
    </form>
  )
}

export function TutorialResetForm() {
  const [state, action, pending] = useActionState(resetTutorialAction, initialState)
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <Input name="reason" placeholder="Reason for restarting the synthetic scenario" required />
      <Button disabled={pending} type="submit" variant="outline">Reset practice</Button>
      <div className="sm:col-span-2"><Feedback state={state} /></div>
    </form>
  )
}

export function LaunchCheckForm({
  checkKey,
  currentEvidence,
  currentStatus,
}: {
  checkKey: string
  currentEvidence: string | null
  currentStatus: Enums<"launch_check_status">
}) {
  const [state, action, pending] = useActionState(reviewLaunchCheckAction, initialState)
  return (
    <form action={action} className="grid gap-2">
      <input name="checkKey" type="hidden" value={checkKey} />
      <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={currentStatus} name="status">
        <option value="pending">Pending</option>
        <option value="passed">Passed</option>
        <option value="waived">Waived</option>
      </select>
      <textarea className="min-h-20 rounded-md border bg-background p-3 text-sm" defaultValue={currentEvidence ?? ""} name="evidence" placeholder="Evidence, test record, owner, and date" />
      <Input name="reason" placeholder="Reason for this review decision" required />
      <Button disabled={pending} type="submit" variant="outline">Record review</Button>
      <Feedback state={state} />
    </form>
  )
}

export function BackupVerificationForm() {
  const [state, action, pending] = useActionState(recordBackupVerificationAction, initialState)
  const now = new Date().toISOString()
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1 text-sm">Scope<select className="h-9 rounded-md border bg-background px-3" defaultValue="full" name="scope"><option value="database">Database</option><option value="storage">Storage</option><option value="full">Full recovery</option></select></label>
      <label className="grid gap-1 text-sm">Environment<select className="h-9 rounded-md border bg-background px-3" defaultValue="development" name="environment"><option value="development">Development</option><option value="staging">Staging</option><option value="production">Production</option></select></label>
      <label className="grid gap-1 text-sm">Status<select className="h-9 rounded-md border bg-background px-3" defaultValue="passed" name="status"><option value="started">Started</option><option value="passed">Passed</option><option value="failed">Failed</option></select></label>
      <label className="grid gap-1 text-sm">Artifact reference<Input name="artifactReference" placeholder="Non-secret backup identifier" /></label>
      <label className="grid gap-1 text-sm">Started at<Input defaultValue={now} name="startedAt" placeholder="ISO 8601 timestamp" required /></label>
      <label className="grid gap-1 text-sm">Completed at<Input defaultValue={now} name="completedAt" placeholder="ISO 8601 timestamp" required /></label>
      <label className="grid gap-1 text-sm">Restore tested at<Input defaultValue={now} name="restoreTestedAt" placeholder="ISO 8601 timestamp" /></label>
      <label className="grid gap-1 text-sm">SHA-256 checksum<Input className="font-mono" name="checksumSha256" placeholder="64 lowercase hexadecimal characters" /></label>
      <label className="grid gap-1 text-sm md:col-span-2">Verification notes<textarea className="min-h-24 rounded-md border bg-background p-3 text-sm" name="notes" required /></label>
      <div><Button disabled={pending} type="submit">Record evidence</Button></div>
      <div className="md:col-span-2"><Feedback state={state} /></div>
    </form>
  )
}
