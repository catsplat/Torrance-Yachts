"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function YachtsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("The yacht workspace failed to load", error)
  }, [error])

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Yacht register
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        The yacht records could not be loaded
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        No changes were made. Check the local services and try the request again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </section>
  )
}
