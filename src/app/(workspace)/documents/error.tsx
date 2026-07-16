"use client"

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <div className="rounded-lg border p-5"><p className="font-medium">The protected document register could not be loaded.</p><button className="mt-3 text-sm text-primary underline" onClick={reset}>Try again</button></div>
}
