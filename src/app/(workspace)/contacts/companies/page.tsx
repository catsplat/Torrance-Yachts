import { ArrowRight, Building2, Plus, Search } from "lucide-react"
import Link from "next/link"

import { DirectoryTabs } from "@/components/contacts/directory-tabs"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { normaliseDirectorySearch } from "@/lib/contacts/validation"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type CompaniesPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const filters = await searchParams
  const search = normaliseDirectorySearch(filters.q)
  const status = filters.status === "all" || filters.status === "inactive"
    ? filters.status
    : "active"

  const supabase = await createClient()
  let query = supabase
    .from("companies")
    .select("id, name, email, phone, website, active, updated_at")
    .order("name")
    .limit(500)

  if (status !== "all") query = query.eq("active", status === "active")

  const { data: companies, error } = await query
  if (error) throw new Error("Unable to load company records.")

  const visibleCompanies = search
    ? companies.filter((company) =>
        [company.name, company.email, company.phone, company.website]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("en-GB").includes(search)),
      )
    : companies

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Master directory</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Companies</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Brokerages, suppliers, and yacht-management organisations linked to their
            individual contacts.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "lg" }))}
          href="/contacts/companies/new"
        >
          <Plus aria-hidden="true" /> Add company
        </Link>
      </div>

      <DirectoryTabs active="companies" />

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto]" method="get">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search companies"
                className="pl-9"
                defaultValue={filters.q ?? ""}
                name="q"
                placeholder="Search name, email, phone, or website"
              />
            </div>
            <select
              aria-label="Filter companies by status"
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

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{visibleCompanies.length} matching companies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visibleCompanies.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Building2 aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No companies match these filters</p>
            </div>
          ) : (
            <div className="divide-y">
              {visibleCompanies.map((company) => (
                <Link
                  className="group grid gap-3 px-5 py-4 transition-colors hover:bg-muted/50 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center"
                  href={`/contacts/companies/${company.id}`}
                  key={company.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{company.name}</p>
                      {!company.active ? <Badge variant="outline">Inactive</Badge> : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {company.email || company.phone || "No company channel recorded"}
                    </p>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {company.website || "Website not recorded"}
                  </p>
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
