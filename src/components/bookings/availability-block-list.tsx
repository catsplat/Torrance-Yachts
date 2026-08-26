"use client"

import { useActionState } from "react"

import { cancelAvailabilityBlockAction, type BookingActionState } from "@/app/(workspace)/bookings/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBookingDate } from "@/lib/bookings/options"

type Block = {
  id: string
  reference: string
  title: string
  charter_start_date: string
  charter_end_date: string
  yacht: { name: string } | null
}

const initialState: BookingActionState = {}

function AvailabilityBlockRow({ block }: { block: Block }) {
  const actionWithBlock = cancelAvailabilityBlockAction.bind(null, block.id)
  const [state, action, pending] = useActionState(actionWithBlock, initialState)

  return (
    <div className="rounded-lg border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{block.title}</span>
          <span className="ml-2 text-muted-foreground">
            {block.yacht?.name} · {formatBookingDate(block.charter_start_date)} – {formatBookingDate(block.charter_end_date)}
          </span>
        </div>
        <Badge variant="outline">{block.reference}</Badge>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">Cancel this hold</summary>
        <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="min-w-56 flex-1 text-xs font-medium">
            Reason
            <Input className="mt-1" maxLength={1000} name="reason" required />
          </label>
          <Button disabled={pending} size="sm" type="submit" variant="outline">
            {pending ? "Cancelling…" : "Cancel hold"}
          </Button>
        </form>
        {state.message ? <p aria-live="polite" className={state.success ? "mt-2 text-xs text-emerald-700" : "mt-2 text-xs text-destructive"}>{state.message}</p> : null}
      </details>
    </div>
  )
}

export function AvailabilityBlockList({ blocks }: { blocks: Block[] }) {
  return <div className="space-y-2">{blocks.map((block) => <AvailabilityBlockRow block={block} key={block.id} />)}</div>
}
