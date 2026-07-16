import { FilePenLine, ShieldCheck } from "lucide-react"

import {
  CommunicationTemplateVersionForm,
  NewCommunicationTemplateForm,
} from "@/components/ai/communication-template-forms"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCommunicationTemplates } from "@/lib/ai/data"
import { getCurrentUser } from "@/lib/auth/current-user"

export default async function CommunicationTemplatesPage() {
  const [templates, user] = await Promise.all([
    getCommunicationTemplates(),
    getCurrentUser(),
  ])
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Versioned business content
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Communication templates</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Manage the KYC request, captain-contact introduction, and post-charter
          broker follow-up without hard-coding private operational wording.
        </p>
      </div>

      {user?.role === "administrator" ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <FilePenLine className="size-5" />
              New template draft
            </CardTitle>
            <CardDescription>
              Drafts are editable. Approval creates an immutable active version.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5"><NewCommunicationTemplateForm /></CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex gap-3 pt-5">
            <ShieldCheck className="size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Templates are visible to staff but editable only by administrators.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.kind.replaceAll("_", " ")} · version {template.version_number}
                  </CardDescription>
                </div>
                <Badge variant={template.status === "approved" ? "default" : "outline"}>
                  {template.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {user?.role === "administrator" ? (
                <CommunicationTemplateVersionForm template={template} />
              ) : (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm font-medium">{template.subject_template}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{template.body_template}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
