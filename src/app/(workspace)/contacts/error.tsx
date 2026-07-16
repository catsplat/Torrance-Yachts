"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function ContactsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    void error
  }, [error])

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Contact directory
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        The directory could not be loaded
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        No changes were made. Check the local services and try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </section>
  )
}
