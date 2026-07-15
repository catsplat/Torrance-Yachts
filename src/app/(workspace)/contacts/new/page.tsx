import { ArrowLeft, UserRoundPlus } from "lucide-react"
import Link from "next/link"

import { ContactForm } from "@/components/contacts/contact-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewContactPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/contacts"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to contacts
      </Link>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <UserRoundPlus aria-hidden="true" className="size-5" />
            </div>
            <div>
              <CardTitle>Add contact</CardTitle>
              <CardDescription className="mt-1.5">
                Create one person record and select every role they perform.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ContactForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
