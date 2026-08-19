import { ArrowLeft, Inbox } from "lucide-react"
import Link from "next/link"

import { EnquiryForm } from "@/components/enquiries/enquiry-form"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { getEnquiryFormOptions } from "@/lib/enquiries/form-options"

export default async function NewEnquiryPage() {
  const options = await getEnquiryFormOptions()

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/enquiries"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to enquiries
      </Link>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Inbox aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Create enquiry</h1>
              <CardDescription className="mt-1.5">
                Record the request manually. Email and AI intake remain disconnected.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4 text-sm">
            <p>Check yacht availability before recording the enquiry. This does not reserve dates.</p>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/bookings/availability">Check availability</Link>
          </div>
          <EnquiryForm mode="create" options={options} />
        </CardContent>
      </Card>
    </div>
  )
}
