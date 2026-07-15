"use client"

import Link from "next/link"
import { useActionState } from "react"

import {
  createContactAction,
  updateContactAction,
  type DirectoryActionState,
} from "@/app/(workspace)/contacts/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { contactRoleLabels } from "@/lib/contacts/options"
import { contactRoleValues } from "@/lib/contacts/validation"
import { cn } from "@/lib/utils"
import type { Tables } from "@/types/database"

type Contact = Tables<"contacts">

type ContactFormProps =
  | { contact?: never; mode: "create" }
  | { contact: Contact; mode: "edit" }

const initialState: DirectoryActionState = {}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-xs text-destructive">{errors[0]}</p>
}

export function ContactForm({ contact, mode }: ContactFormProps) {
  const updateAction = contact ? updateContactAction.bind(null, contact.id) : null
  const [state, action, pending] = useActionState(
    mode === "create" ? createContactAction : updateAction!,
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
          Identity and contact details
        </legend>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="full_name">
            Full name
          </label>
          <Input
            autoComplete="name"
            defaultValue={contact?.full_name ?? ""}
            id="full_name"
            maxLength={160}
            name="full_name"
            required
          />
          <FieldError errors={state.fieldErrors?.full_name} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input
            autoComplete="email"
            defaultValue={contact?.email ?? ""}
            id="email"
            maxLength={320}
            name="email"
            type="email"
          />
          <FieldError errors={state.fieldErrors?.email} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="phone">
            Phone
          </label>
          <Input
            autoComplete="tel"
            defaultValue={contact?.phone ?? ""}
            id="phone"
            maxLength={32}
            name="phone"
            placeholder="+44 1632 960000"
            type="tel"
          />
          <FieldError errors={state.fieldErrors?.phone} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Operational roles</legend>
        <p className="text-xs leading-5 text-muted-foreground">
          Select every role this person performs. One record can represent, for example,
          both a broker and a customer.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {contactRoleValues.map((role) => (
            <label
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted/50"
              key={role}
            >
              <input
                className="size-4 accent-primary"
                defaultChecked={contact?.roles.includes(role) ?? false}
                name="roles"
                type="checkbox"
                value={role}
              />
              {contactRoleLabels[role]}
            </label>
          ))}
        </div>
        <FieldError errors={state.fieldErrors?.roles} />
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
            defaultValue={String(contact?.active ?? true)}
            id="active"
            name="active"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Inactive contacts remain in audit history but are hidden by the default filter.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="notes">
            Internal notes
          </label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue={contact?.notes ?? ""}
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
          href="/contacts"
        >
          Cancel
        </Link>
        <Button disabled={pending} size="lg" type="submit">
          {pending ? "Saving…" : mode === "create" ? "Add contact" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
