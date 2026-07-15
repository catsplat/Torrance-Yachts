import { ArrowRight, Plus, Search, UserRound, UsersRound } from "lucide-react"
import Link from "next/link"

import { DirectoryTabs } from "@/components/contacts/directory-tabs"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { contactRoleLabels } from "@/lib/contacts/options"
import {
  contactRoleValues,
  normaliseDirectorySearch,
} from "@/lib/contacts/validation"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { Enums } from "@/types/database"

type ContactsPageProps = {
  searchParams: Promise<{
    q?: string
    role?: string
    status?: string
  }>
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const filters = await searchParams
  const search = normaliseDirectorySearch(filters.q)
  const role = contactRoleValues.includes(filters.role as Enums<"contact_role">)
    ? (filters.role as Enums<"contact_role">)
    : undefined
  const status = filters.status === "all" || filters.status === "inactive"
    ? filters.status
    : "active"

  const supabase = await createClient()
  let query = supabase
    .from("contacts")
    .select("id, full_name, email, phone, roles, active, updated_at")
    .order("full_name")
    .limit(500)

  if (status !== "all") query = query.eq("active", status === "active")
  if (role) query = query.contains("roles", [role])

  const { data: contacts, error } = await query
  if (error) throw new Error("Unable to load contact records.")

  const visibleContacts = search
    ? contacts.filter((contact) =>
        [contact.full_name, contact.email, contact.phone, ...contact.roles]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("en-GB").includes(search)),
      )
    : contacts

  const roleCount = new Set(visibleContacts.flatMap((contact) => contact.roles)).size

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Master directory</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Contacts</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            People are stored once and can hold several operational roles across
            enquiries, companies, and yachts.
          </p>
        </div>
        <Link className={cn(buttonVariants({ size: "lg" }))} href="/contacts/new">
          <Plus aria-hidden="true" /> Add contact
        </Link>
      </div>

      <DirectoryTabs active="contacts" />

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem_auto]" method="get">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search contacts"
                className="pl-9"
                defaultValue={filters.q ?? ""}
                name="q"
                placeholder="Search name, email, phone, or role"
              />
            </div>
            <select
              aria-label="Filter contacts by role"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue={role ?? ""}
              name="role"
            >
              <option value="">All roles</option>
              {contactRoleValues.map((value) => (
                <option key={value} value={value}>
                  {contactRoleLabels[value]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter contacts by status"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue={status}
              name="status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All statuses</option>
            </select>
            <button className={cn(buttonVariants())} type="submit">
              Apply filters
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <UsersRound aria-hidden="true" className="size-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{visibleContacts.length}</p>
              <p className="text-xs text-muted-foreground">Matching contacts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <UserRound aria-hidden="true" className="size-5 text-emerald-700" />
            <div>
              <p className="text-2xl font-semibold">{roleCount}</p>
              <p className="text-xs text-muted-foreground">Roles represented</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>People</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visibleContacts.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <UsersRound aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No contacts match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Change the filters or add a new synthetic contact.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {visibleContacts.map((contact) => (
                <Link
                  className="group grid gap-3 px-5 py-4 transition-colors hover:bg-muted/50 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center"
                  href={`/contacts/${contact.id}`}
                  key={contact.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{contact.full_name}</p>
                      {!contact.active ? <Badge variant="outline">Inactive</Badge> : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {contact.email || contact.phone || "No contact channel recorded"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.roles.map((contactRole) => (
                      <Badge key={contactRole} variant="secondary">
                        {contactRoleLabels[contactRole]}
                      </Badge>
                    ))}
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-1 md:block"
                  />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
