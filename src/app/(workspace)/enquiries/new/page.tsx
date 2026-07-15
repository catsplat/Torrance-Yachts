import { ArrowLeft, Inbox } from "lucide-react"
import Link from "next/link"

import { EnquiryForm } from "@/components/enquiries/enquiry-form"
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
          <EnquiryForm mode="create" options={options} />
        </CardContent>
      </Card>
    </div>
  )
}
