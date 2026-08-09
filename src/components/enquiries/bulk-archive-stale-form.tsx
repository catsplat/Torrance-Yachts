"use client"

import { useActionState } from "react"

import { archiveStaleEnquiriesAction } from "@/app/(workspace)/enquiries/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function BulkArchiveStaleForm() {
  const [state, action, pending] = useActionState(archiveStaleEnquiriesAction, {})
  return <form action={action} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto]" id="bulk-stale-enquiries">
    <label className="grid gap-1 text-xs font-medium">Archive reason
      <Input name="reason" placeholder="Why these inactive enquiries are being archived" required minLength={10} />
    </label>
    <Button className="self-end" disabled={pending} type="submit" variant="outline">{pending ? "Archiving…" : "Archive selected"}</Button>
    {state.message ? <p aria-live="polite" className="text-sm text-muted-foreground sm:col-span-2">{state.message}</p> : null}
  </form>
}
