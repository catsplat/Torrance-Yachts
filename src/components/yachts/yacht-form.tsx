"use client"

import Link from "next/link"
import { useActionState } from "react"

import {
  createYachtAction,
  updateYachtAction,
  type YachtActionState,
} from "@/app/(workspace)/yachts/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Tables } from "@/types/database"

type Yacht = Tables<"yachts">

type YachtFormProps =
  | { mode: "create"; yacht?: never }
  | { mode: "edit"; yacht: Yacht }

const initialState: YachtActionState = {}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-xs text-destructive">{errors[0]}</p>
}

function textDefault(value: string | number | null | undefined) {
  return value ?? ""
}

export function YachtForm({ mode, yacht }: YachtFormProps) {
  const updateAction = yacht ? updateYachtAction.bind(null, yacht.id) : null
  const [state, action, pending] = useActionState(
    mode === "create" ? createYachtAction : updateAction!,
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
        <legend className="col-span-full mb-1 text-sm font-semibold text-foreground">
          Identity and operating state
        </legend>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">Yacht name</label>
          <Input id="name" name="name" defaultValue={textDefault(yacht?.name)} required />
          <FieldError errors={state.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="builder">Builder</label>
          <Input id="builder" name="builder" defaultValue={textDefault(yacht?.builder)} />
          <FieldError errors={state.fieldErrors?.builder} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="year_built">Year built</label>
          <Input id="year_built" name="year_built" type="number" min="1900" max="2100" defaultValue={textDefault(yacht?.year_built)} />
          <FieldError errors={state.fieldErrors?.year_built} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="status">Operational status</label>
          <select
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue={yacht?.status ?? "active"}
            id="status"
            name="status"
          >
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
          <FieldError errors={state.fieldErrors?.status} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="col-span-full mb-1 text-sm font-semibold text-foreground">
          Specifications
        </legend>
        {[
          ["length_metres", "Length (m)", yacht?.length_metres, "0.01"],
          ["beam_metres", "Beam (m)", yacht?.beam_metres, "0.01"],
          ["guest_capacity", "Guests", yacht?.guest_capacity, "1"],
          ["cabin_count", "Cabins", yacht?.cabin_count, "1"],
          ["crew_count", "Crew", yacht?.crew_count, "1"],
          ["cruise_speed_knots", "Cruising speed (kn)", yacht?.cruise_speed_knots, "0.01"],
          ["max_speed_knots", "Maximum speed (kn)", yacht?.max_speed_knots, "0.01"],
        ].map(([name, label, value, step]) => (
          <div className="space-y-2" key={String(name)}>
            <label className="text-sm font-medium" htmlFor={String(name)}>{label}</label>
            <Input id={String(name)} name={String(name)} type="number" min="0" step={String(step)} defaultValue={textDefault(value as number | null)} />
            <FieldError errors={state.fieldErrors?.[String(name)]} />
          </div>
        ))}
      </fieldset>

      <fieldset className="grid gap-5 md:grid-cols-2">
        <legend className="col-span-full mb-1 text-sm font-semibold text-foreground">
          Operations
        </legend>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="home_port">Home port</label>
          <Input id="home_port" name="home_port" defaultValue={textDefault(yacht?.home_port)} />
          <FieldError errors={state.fieldErrors?.home_port} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="preferred_ports">Preferred ports</label>
          <Input id="preferred_ports" name="preferred_ports" defaultValue={yacht?.preferred_ports.join(", ") ?? ""} placeholder="Athens, Mykonos" />
          <p className="text-xs text-muted-foreground">Separate multiple ports with commas.</p>
          <FieldError errors={state.fieldErrors?.preferred_ports} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="notification_phone">Yacht notification phone</label>
          <Input id="notification_phone" name="notification_phone" type="tel" defaultValue={textDefault(yacht?.notification_phone)} placeholder="+44 …" />
          <p className="text-xs text-muted-foreground">Reserved for the yacht-specific notification recipient.</p>
          <FieldError errors={state.fieldErrors?.notification_phone} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="notes">Operational notes</label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue={textDefault(yacht?.notes)}
            id="notes"
            maxLength={5000}
            name="notes"
          />
          <FieldError errors={state.fieldErrors?.notes} />
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
        <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }))} href="/yachts">
          Cancel
        </Link>
        <Button disabled={pending} size="lg" type="submit">
          {pending ? "Saving…" : mode === "create" ? "Add yacht" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
