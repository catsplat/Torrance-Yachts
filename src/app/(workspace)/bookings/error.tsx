"use client"
import { Button } from "@/components/ui/button"
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="mx-auto max-w-xl rounded-xl border p-8 text-center"><h1 className="text-xl font-semibold">Bookings could not be loaded</h1><p className="mt-2 text-sm text-muted-foreground">No booking state was changed. Retry the read.</p><Button className="mt-4" onClick={reset}>Try again</Button></div> }
