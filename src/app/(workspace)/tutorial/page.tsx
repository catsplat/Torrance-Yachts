import { ArrowRight, Bot, CheckCircle2, Mail, Pause, Play, RotateCcw, UserCheck } from "lucide-react"
import Link from "next/link"

import { pauseTutorialAction, startTutorialAction } from "@/app/(workspace)/tutorial/actions"
import { TutorialAdvanceForm, TutorialResetForm } from "@/components/tutorial/tutorial-forms"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTutorialStep, tutorialSteps } from "@/lib/tutorial/content"
import { getTutorialWorkspace } from "@/lib/tutorial/data"
import { cn } from "@/lib/utils"

const syntheticEmail = {
  body: "We are enquiring for a seven-night family charter in Greece for 10 guests. Preferred dates are 14–21 August. Please advise availability, rate, and whether Athens embarkation is possible.",
  from: "Alex Morgan, Example Charter Partners",
  subject: "Example August family charter enquiry",
}

export default async function TutorialPage() {
  const { history, session } = await getTutorialWorkspace()
  const currentStepNumber = session?.current_step ?? 0
  const currentStep = getTutorialStep(currentStepNumber)
  const nextStep = getTutorialStep(Math.min(currentStepNumber + 1, 11))
  const active = session?.status === "active"
  const completed = session?.status === "completed"

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Tutorial</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Practice the full workflow with a sample charter.
          </p>
        </div>
        <Badge variant={completed ? "default" : "outline"}>{session?.status?.replace("_", " ") ?? "not started"}</Badge>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Mail className="size-5 text-primary" />Practice email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm"><strong>From:</strong> {syntheticEmail.from}</p>
          <p className="text-sm"><strong>Subject:</strong> {syntheticEmail.subject}</p>
          <p className="rounded-xl bg-muted p-4 text-sm leading-6">{syntheticEmail.body}</p>
        </CardContent>
      </Card>

      {!active && !completed ? (
        <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5"><div><p className="font-medium">{session?.status === "paused" ? "Tutorial paused" : "Ready to begin"}</p><p className="mt-1 text-sm text-muted-foreground">Begin with the sample enquiry above.</p></div><form action={startTutorialAction}><button className={cn(buttonVariants(), "inline-flex items-center gap-2")} type="submit"><Play className="size-4" />{session?.status === "paused" ? "Resume tutorial" : "Start tutorial"}</button></form></CardContent></Card>
      ) : null}

      {active ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)]">
          <Card data-tutorial-anchor="tutorial-practice">
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase text-primary">Step {currentStep.id + 1} of 12</p><CardTitle className="mt-1">{currentStep.title}</CardTitle></div>
                <Badge variant="outline">{session.practice_stage.replaceAll("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <p className="leading-7">{currentStep.explanation}</p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Your action:</strong> {currentStep.humanControl}</div>
              <div className="flex flex-wrap gap-3">
                <Link className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")} href={`${currentStep.route}?tutorial=${currentStep.id}`}>Open highlighted interface<ArrowRight className="size-4" /></Link>
                <form action={pauseTutorialAction}><button className={cn(buttonVariants({ variant: "ghost" }), "inline-flex items-center gap-2")} type="submit"><Pause className="size-4" />Pause</button></form>
              </div>
              <div className="border-t pt-5">
                <TutorialAdvanceForm
                  eventType={currentStepNumber === 11 ? "tutorial_completed" : nextStep.eventType}
                  label={currentStepNumber === 11 ? "Complete tutorial" : `Complete step and continue`}
                  practiceStage={currentStepNumber === 11 ? currentStep.practiceStage : nextStep.practiceStage}
                  step={currentStepNumber === 11 ? 11 : currentStepNumber + 1}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b"><CardTitle>Who does what</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex gap-3"><Bot className="mt-0.5 size-4 text-primary" /><p className="text-sm"><strong>Assistant:</strong> extracts details and prepares drafts.</p></div>
              <div className="flex gap-3"><UserCheck className="mt-0.5 size-4 text-primary" /><p className="text-sm"><strong>Staff:</strong> checks, approves and sends.</p></div>
              <div className="flex gap-3"><RotateCcw className="mt-0.5 size-4 text-primary" /><p className="text-sm"><strong>Reset:</strong> starts the tutorial again.</p></div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {completed ? (
        <Card className="border-emerald-200 bg-emerald-50/50"><CardContent className="flex gap-4 pt-5"><CheckCircle2 className="size-6 text-emerald-700" /><div><p className="font-semibold text-emerald-950">Tutorial complete</p><p className="mt-1 text-sm text-emerald-900">You followed the enquiry from email to broker follow-up.</p></div></CardContent></Card>
      ) : null}

      {session ? <Card><CardHeader className="border-b"><CardTitle>Restart tutorial</CardTitle><CardDescription>Start again from step 1.</CardDescription></CardHeader><CardContent className="pt-5"><TutorialResetForm /></CardContent></Card> : null}

      <Card>
        <CardHeader className="border-b"><CardTitle>Complete workflow map</CardTitle></CardHeader>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
          {tutorialSteps.map((step) => (
            <div className={cn("rounded-xl border p-4", step.id === currentStepNumber && active ? "border-primary bg-primary/5" : "")} key={step.id}>
              <div className="flex items-start gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{step.id + 1}</span><div><p className="font-medium">{step.title}</p><p className="mt-1 text-xs text-muted-foreground">{step.practiceStage.replaceAll("_", " ")}</p></div></div>
            </div>
          ))}
        </CardContent>
      </Card>

      {history.length ? <p className="text-xs text-muted-foreground">{history.length} recent tutorial events are retained for your training audit.</p> : null}
    </div>
  )
}
