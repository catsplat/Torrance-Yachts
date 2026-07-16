import { CheckCircle2, FileClock, Settings2 } from "lucide-react"
import Link from "next/link"

import { CloneTaskTemplateForm } from "@/components/tasks/task-forms"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/current-user"
import { getTaskTemplateRegister } from "@/lib/tasks/data"

export default async function TaskTemplatesPage() {
  const [templates, user] = await Promise.all([getTaskTemplateRegister(), getCurrentUser()])
  return <div className="mx-auto max-w-6xl space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workflow configuration</p><h1 className="mt-1 text-3xl font-semibold">Task templates</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Versioned data controls generated booking work. Approved versions are immutable; administrators clone them before editing.</p></div><Card><CardContent className="p-0"><div className="divide-y">{templates.map((template) => <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_18rem]" key={template.id}><Link className="block" href={`/tasks/templates/${template.id}`}><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{template.name} · v{template.version_number}</p><Badge variant={template.status === "approved" ? "default" : "outline"}>{template.status}</Badge>{template.is_default ? <Badge className="bg-emerald-700">Default</Badge> : null}</div><p className="mt-2 text-sm text-muted-foreground">{template.description}</p><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">{template.status === "approved" ? <CheckCircle2 className="size-3.5" /> : <FileClock className="size-3.5" />}{template.steps[0]?.count ?? 0} configured steps</p></Link>{user?.role === "administrator" && template.status === "approved" ? <div><CloneTaskTemplateForm name={template.name} templateId={template.id} /></div> : null}</div>)}</div></CardContent></Card>{user?.role !== "administrator" ? <Card><CardContent className="flex items-center gap-3 pt-5"><Settings2 className="size-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">Template configuration is visible to staff but editable only by administrators.</p></CardContent></Card> : null}</div>
}
