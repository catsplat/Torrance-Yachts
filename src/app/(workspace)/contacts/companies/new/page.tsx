import { ArrowLeft, Building2 } from "lucide-react"
import Link from "next/link"

import { CompanyForm } from "@/components/contacts/company-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/contacts/companies"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Back to companies
      </Link>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Building2 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <CardTitle>Add company</CardTitle>
              <CardDescription className="mt-1.5">
                Create an organisation before linking its individual contacts.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <CompanyForm mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
