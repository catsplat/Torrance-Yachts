"use client"

import Link from "next/link"
import { useActionState } from "react"

import {
  createCompanyAction,
  updateCompanyAction,
  type DirectoryActionState,
} from "@/app/(workspace)/contacts/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Tables } from "@/types/database"

type Company = Tables<"companies">

type CompanyFormProps =
  | { company?: never; mode: "create" }
  | { company: Company; mode: "edit" }

const initialState: DirectoryActionState = {}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-xs text-destructive">{errors[0]}</p>
}

export function CompanyForm({ company, mode }: CompanyFormProps) {
  const updateAction = company ? updateCompanyAction.bind(null, company.id) : null
  const [state, action, pending] = useActionState(
    mode === "create" ? createCompanyAction : updateAction!,
    initialState,
  )

  return (
    <form action={action} className="space-y-7">
      {state.message ? (
        <p
          aria-live="polite"
          className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <fieldset className="grid gap-5 md:grid-cols-2">
        <legend className="col-span-full mb-1 text-sm font-semibold">
          Company details
        </legend>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="name">
            Company name
          </label>
          <Input
            autoComplete="organization"
            defaultValue={company?.name ?? ""}
            id="name"
            maxLength={160}
            name="name"
            required
          />
          <FieldError errors={state.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            General email
          </label>
          <Input
            defaultValue={company?.email ?? ""}
            id="email"
            maxLength={320}
            name="email"
            type="email"
          />
          <FieldError errors={state.fieldErrors?.email} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="phone">
            General phone
          </label>
          <Input
            defaultValue={company?.phone ?? ""}
            id="phone"
            maxLength={32}
            name="phone"
            type="tel"
          />
          <FieldError errors={state.fieldErrors?.phone} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="website">
            Website
          </label>
          <Input
            defaultValue={company?.website ?? ""}
            id="website"
            maxLength={500}
            name="website"
            placeholder="https://example.com"
            type="url"
          />
          <FieldError errors={state.fieldErrors?.website} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 md:grid-cols-2">
        <legend className="col-span-full mb-1 text-sm font-semibold">
          Directory status and notes
        </legend>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="active">
            Status
          </label>
          <select
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue={String(company?.active ?? true)}
            id="active"
            name="active"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="notes">
            Internal notes
          </label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue={company?.notes ?? ""}
            id="notes"
            maxLength={5000}
            name="notes"
          />
          <FieldError errors={state.fieldErrors?.notes} />
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
        <Link
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          href="/contacts/companies"
        >
          Cancel
        </Link>
        <Button disabled={pending} size="lg" type="submit">
          {pending ? "Saving…" : mode === "create" ? "Add company" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
