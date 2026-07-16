"use client"

import { X } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { getTutorialStep } from "@/lib/tutorial/content"
import { cn } from "@/lib/utils"

export function TutorialSpotlight() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stepValue = searchParams.get("tutorial")
  const stepNumber = Number(stepValue)
  const enabled = stepValue !== null && Number.isInteger(stepNumber) && stepNumber >= 0 && stepNumber <= 11
  const step = getTutorialStep(stepNumber)

  useEffect(() => {
    if (!enabled) return
    const target = document.querySelector<HTMLElement>(
      `[data-tutorial-anchor="${step.anchor}"]`,
    )
    if (!target) return
    target.classList.add("tutorial-spotlight-target")
    target.scrollIntoView({ behavior: "smooth", block: "center" })
    return () => target.classList.remove("tutorial-spotlight-target")
  }, [enabled, step.anchor])

  if (!enabled) return null

  return (
    <aside aria-label="Guided tutorial" className="fixed bottom-4 right-4 z-[80] w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-primary/30 bg-background p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tutorial step {step.id + 1} of 12</p>
          <p className="mt-1 font-semibold">{step.title}</p>
        </div>
        <Link aria-label="Exit tutorial spotlight" className={cn(buttonVariants({ size: "icon", variant: "ghost" }), "size-8")} href={pathname}><X /></Link>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.explanation}</p>
      <p className="mt-3 rounded-lg bg-muted p-3 text-xs leading-5"><strong>Human control:</strong> {step.humanControl}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className={buttonVariants()} href="/tutorial">Return to practice</Link>
        <Button onClick={() => document.querySelector<HTMLElement>(`[data-tutorial-anchor="${step.anchor}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })} type="button" variant="outline">Show control</Button>
      </div>
    </aside>
  )
}
