"use client"

import { Button } from "@/components/ui/button"

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center">
    <h1 className="text-xl font-semibold">This view could not be loaded</h1>
    <p className="mt-2 text-sm text-muted-foreground">No action has been assumed complete. Check the connection and try again.</p>
    <Button className="mt-5" onClick={reset}>Try again</Button>
  </div>
}
