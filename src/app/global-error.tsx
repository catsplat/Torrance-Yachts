"use client"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <main className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">The workspace could not continue</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            No operational action should be assumed complete. Retry the request or return
            to the dashboard after checking the local services.
          </p>
          <Button className="mt-5" onClick={reset}>
            Try again
          </Button>
        </main>
      </body>
    </html>
  )
}
