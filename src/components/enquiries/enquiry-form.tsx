"use client"

import Link from "next/link"
import { useActionState } from "react"

import {
  createEnquiryAction,
  updateEnquiryAction,
  type EnquiryActionState,
} from "@/app/(workspace)/enquiries/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { enquiryPriorityLabels } from "@/lib/enquiries/options"
import { enquiryPriorityValues } from "@/lib/enquiries/validation"
import { cn } from "@/lib/utils"
import type { Tables } from "@/types/database"

type Enquiry = Tables<"enquiries">
type Option = { id: string; name: string }

export type EnquiryFormOptions = {
  brokerCompanies: Option[]
  brokers: Option[]
  customers: Option[]
  owners: Option[]
  yachts: Option[]
}

type EnquiryFormProps =
  | { enquiry?: never; mode: "create"; options: EnquiryFormOptions }
  | { enquiry: Enquiry; mode: "edit"; options: EnquiryFormOptions }

const initialState: EnquiryActionState = {}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-xs text-destructive">{errors[0]}</p>
}

function OptionSelect({
  defaultValue,
  emptyLabel,
  id,
  name,
  options,
}: {
  defaultValue?: string | null
  emptyLabel: string
  id: string
  name: string
  options: Option[]
}) {
  return (
    <select
      className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
      defaultValue={defaultValue ?? ""}
      id={id}
      name={name}
    >
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  )
}

export function EnquiryForm({ enquiry, mode, options }: EnquiryFormProps) {
  const updateAction = enquiry ? updateEnquiryAction.bind(null, enquiry.id) : null
  const [state, action, pending] = useActionState(
    mode === "create" ? createEnquiryAction : updateAction!,
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
          Requester and ownership
        </legend>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="customer_contact_id">
            Customer or charterer
          </label>
          <OptionSelect
            defaultValue={enquiry?.customer_contact_id}
            emptyLabel="Not known yet"
            id="customer_contact_id"
            name="customer_contact_id"
            options={options.customers}
          />
          <FieldError errors={state.fieldErrors?.customer_contact_id} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="broker_contact_id">
            Broker contact
          </label>
          <OptionSelect
            defaultValue={enquiry?.broker_contact_id}
            emptyLabel="No broker contact"
            id="broker_contact_id"
            name="broker_contact_id"
            options={options.brokers}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="broker_company_id">
            Broker company
          </label>
          <OptionSelect
            defaultValue={enquiry?.broker_company_id}
            emptyLabel="No broker company"
            id="broker_company_id"
            name="broker_company_id"
            options={options.brokerCompanies}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="owner_user_id">
            Internal owner
          </label>
          <OptionSelect
            defaultValue={enquiry?.owner_user_id}
            emptyLabel={mode === "create" ? "Assign to me" : "Unassigned"}
            id="owner_user_id"
            name="owner_user_id"
            options={options.owners}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 md:grid-cols-2">
        <legend className="col-span-full mb-1 text-sm font-semibold">
          Enquiry summary
        </legend>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="summary">
            Summary
          </label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            defaultValue={enquiry?.summary ?? ""}
            id="summary"
            maxLength={2000}
            name="summary"
            required
          />
          <FieldError errors={state.fieldErrors?.summary} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="priority">
            Priority
          </label>
          <select
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            defaultValue={enquiry?.priority ?? "normal"}
            id="priority"
            name="priority"
          >
            {enquiryPriorityValues.map((priority) => (
              <option key={priority} value={priority}>
                {enquiryPriorityLabels[priority]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="requested_yacht_id">
            Requested yacht
          </label>
          <OptionSelect
            defaultValue={enquiry?.requested_yacht_id}
            emptyLabel="No yacht selected"
            id="requested_yacht_id"
            name="requested_yacht_id"
            options={options.yachts}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <legend className="col-span-full mb-1 text-sm font-semibold">
          Charter requirements
        </legend>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="charter_start_date">
            Start date
          </label>
          <Input
            defaultValue={enquiry?.charter_start_date ?? ""}
            id="charter_start_date"
            name="charter_start_date"
            type="date"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="charter_end_date">
            End date
          </label>
          <Input
            defaultValue={enquiry?.charter_end_date ?? ""}
            id="charter_end_date"
            name="charter_end_date"
            type="date"
          />
          <FieldError errors={state.fieldErrors?.charter_end_date} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="guest_count">
            Guests
          </label>
          <Input
            defaultValue={enquiry?.guest_count ?? ""}
            id="guest_count"
            max={36}
            min={1}
            name="guest_count"
            type="number"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="embarkation_port">
            Embarkation port
          </label>
          <Input
            defaultValue={enquiry?.embarkation_port ?? ""}
            id="embarkation_port"
            maxLength={120}
            name="embarkation_port"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="disembarkation_port">
            Disembarkation port
          </label>
          <Input
            defaultValue={enquiry?.disembarkation_port ?? ""}
            id="disembarkation_port"
            maxLength={120}
            name="disembarkation_port"
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="budget_amount">
              Budget
            </label>
            <Input
              defaultValue={enquiry?.budget_amount ?? ""}
              id="budget_amount"
              min={0}
              name="budget_amount"
              step="0.01"
              type="number"
            />
            <FieldError errors={state.fieldErrors?.budget_amount} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="currency">
              Currency
            </label>
            <Input
              defaultValue={enquiry?.currency ?? ""}
              id="currency"
              maxLength={3}
              name="currency"
              placeholder="EUR"
            />
            <FieldError errors={state.fieldErrors?.currency} />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
        <Link
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          href={enquiry ? `/enquiries/${enquiry.id}` : "/enquiries"}
        >
          Cancel
        </Link>
        <Button disabled={pending} size="lg" type="submit">
          {pending ? "Saving…" : mode === "create" ? "Create enquiry" : "Save details"}
        </Button>
      </div>
    </form>
  )
}
