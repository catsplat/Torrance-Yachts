"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function OffersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-2xl py-16"><Card><CardContent className="flex flex-col items-center px-6 py-12 text-center"><AlertTriangle className="size-10 text-destructive" aria-hidden="true" /><h1 className="mt-4 text-xl font-semibold">Offers could not be loaded</h1><p className="mt-2 text-sm text-muted-foreground">No changes were made. Check the local database and try again.</p><Button className="mt-5" onClick={reset}>Try again</Button></CardContent></Card></div>
}
