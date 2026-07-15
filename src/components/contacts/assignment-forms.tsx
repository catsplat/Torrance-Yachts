"use client"

import { useActionState } from "react"

import {
  assignCompanyAction,
  assignYachtAction,
  type DirectoryActionState,
} from "@/app/(workspace)/contacts/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { yachtResponsibilityLabels } from "@/lib/contacts/options"
import { yachtResponsibilityValues } from "@/lib/contacts/validation"

type Option = { id: string; name: string }

const initialState: DirectoryActionState = {}

function FormMessage({ state }: { state: DirectoryActionState }) {
  if (!state.message) return null
  const success = state.message.endsWith("added.")
  return (
    <p
      aria-live="polite"
      className={
        success
          ? "text-xs text-emerald-700"
          : "text-xs text-destructive"
      }
    >
      {state.message}
    </p>
  )
}

export function CompanyAssignmentForm({
  companies,
  contactId,
}: {
  companies: Option[]
  contactId: string
}) {
  const actionWithContact = assignCompanyAction.bind(null, contactId)
  const [state, action, pending] = useActionState(actionWithContact, initialState)

  return (
    <form action={action} className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <label className="text-xs font-medium" htmlFor="company_id">
          Company
        </label>
        <select
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          id="company_id"
          name="company_id"
          required
        >
          <option value="">Choose a company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium" htmlFor="job_title">
          Job title
        </label>
        <Input id="job_title" maxLength={160} name="job_title" />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input className="size-4 accent-primary" name="is_primary" type="checkbox" />
        Primary company
      </label>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <Button disabled={pending || companies.length === 0} type="submit">
          {pending ? "Adding…" : "Add company link"}
        </Button>
      </div>
    </form>
  )
}

export function YachtAssignmentForm({
  contactId,
  yachts,
}: {
  contactId: string
  yachts: Option[]
}) {
  const actionWithContact = assignYachtAction.bind(null, contactId)
  const [state, action, pending] = useActionState(actionWithContact, initialState)

  return (
    <form action={action} className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium" htmlFor="yacht_id">
          Yacht
        </label>
        <select
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          id="yacht_id"
          name="yacht_id"
          required
        >
          <option value="">Choose a yacht</option>
          {yachts.map((yacht) => (
            <option key={yacht.id} value={yacht.id}>
              {yacht.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium" htmlFor="responsibility">
          Responsibility
        </label>
        <select
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          id="responsibility"
          name="responsibility"
        >
          {yachtResponsibilityValues.map((responsibility) => (
            <option key={responsibility} value={responsibility}>
              {yachtResponsibilityLabels[responsibility]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input className="size-4 accent-primary" name="is_primary" type="checkbox" />
        Primary for this role
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          className="size-4 accent-primary"
          name="notifications_enabled"
          type="checkbox"
        />
        Eligible for notifications
      </label>
      <div className="space-y-1.5 sm:col-span-2">
        <label className="text-xs font-medium" htmlFor="assignment_notes">
          Assignment notes
        </label>
        <textarea
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          id="assignment_notes"
          maxLength={1000}
          name="notes"
        />
      </div>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <Button disabled={pending || yachts.length === 0} type="submit">
          {pending ? "Adding…" : "Add yacht responsibility"}
        </Button>
      </div>
    </form>
  )
}
