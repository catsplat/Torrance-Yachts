import {
  AlertTriangle,
  ArrowRight,
  Inbox,
  Plus,
  Search,
  UserRoundCheck,
} from "lucide-react"
import Link from "next/link"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CursorPagination } from "@/components/ui/cursor-pagination"
import { Input } from "@/components/ui/input"
import { getEnquiryRegisterPage } from "@/lib/enquiries/data"
import {
  enquiryPriorityLabels,
  enquiryPriorityTones,
  enquiryStatusLabels,
  enquiryStatusTones,
} from "@/lib/enquiries/options"
import {
  enquiryPriorityValues,
  enquiryStatusValues,
  normaliseEnquirySearch,
} from "@/lib/enquiries/validation"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import type { Enums } from "@/types/database"

type EnquiriesPageProps = {
  searchParams: Promise<{
    cursor?: string
    priority?: string
    q?: string
    status?: string
    yacht?: string
  }>
}

function formatDate(value: string | null) {
  if (!value) return "Dates not recorded"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

export default async function EnquiriesPage({ searchParams }: EnquiriesPageProps) {
  const filters = await searchParams
  const search = normaliseEnquirySearch(filters.q)
  const status = enquiryStatusValues.includes(filters.status as Enums<"enquiry_status">)
    ? (filters.status as Enums<"enquiry_status">)
    : filters.status === "all"
      ? "all"
      : "open"
  const priority = enquiryPriorityValues.includes(
    filters.priority as Enums<"enquiry_priority">,
  )
    ? (filters.priority as Enums<"enquiry_priority">)
    : undefined
  const yachtId = z.uuid().safeParse(filters.yacht).success ? filters.yacht : undefined

  const supabase = await createClient()
  const [enquiryRegister, yachtsResult] = await Promise.all([
    getEnquiryRegisterPage({
      cursor: filters.cursor,
      priority,
      query: search,
      status,
      yachtId,
    }),
    supabase.from("yachts").select("id, name").order("name"),
  ])
  if (yachtsResult.error) throw new Error("Unable to load enquiry records.")

  const visibleEnquiries = enquiryRegister.enquiries
  const needsResponse = visibleEnquiries.filter((enquiry) =>
    ["new", "waiting_for_reply"].includes(enquiry.status),
  ).length
  const highPriority = visibleEnquiries.filter((enquiry) =>
    ["high", "urgent"].includes(enquiry.priority),
  ).length
  const unassigned = visibleEnquiries.filter((enquiry) => !enquiry.owner_name).length

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Manual operations pipeline</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Enquiries</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Search the complete authorised pipeline. Filters run in PostgreSQL so older requests
            remain available for review.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "lg" }))}
          data-tutorial-anchor="enquiry-create"
          href="/enquiries/new"
        >
          <Plus aria-hidden="true" /> New enquiry
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_12rem_auto]"
            method="get"
          >
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search enquiries"
                className="pl-9"
                defaultValue={filters.q ?? ""}
                name="q"
                placeholder="Reference, person, company, yacht, or summary"
              />
            </div>
            <select
              aria-label="Filter enquiries by status"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue={status}
              name="status"
            >
              <option value="open">Open lifecycle</option>
              <option value="all">All states</option>
              {enquiryStatusValues.map((value) => (
                <option key={value} value={value}>
                  {enquiryStatusLabels[value]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter enquiries by priority"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue={priority ?? ""}
              name="priority"
            >
              <option value="">All priorities</option>
              {enquiryPriorityValues.map((value) => (
                <option key={value} value={value}>
                  {enquiryPriorityLabels[value]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter enquiries by yacht"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue={yachtId ?? ""}
              name="yacht"
            >
              <option value="">All yachts</option>
              {yachtsResult.data.map((yacht) => (
                <option key={yacht.id} value={yacht.id}>
                  {yacht.name}
                </option>
              ))}
            </select>
            <button className={cn(buttonVariants())} type="submit">
              Apply filters
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Inbox aria-hidden="true" className="size-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{enquiryRegister.totalCount}</p>
              <p className="text-xs text-muted-foreground">Matching enquiries</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <AlertTriangle aria-hidden="true" className="size-5 text-amber-700" />
            <div>
              <p className="text-2xl font-semibold">{needsResponse}</p>
              <p className="text-xs text-muted-foreground">Need response on this page</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <AlertTriangle aria-hidden="true" className="size-5 text-rose-700" />
            <div>
              <p className="text-2xl font-semibold">{highPriority}</p>
              <p className="text-xs text-muted-foreground">High or urgent on this page</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <UserRoundCheck aria-hidden="true" className="size-5 text-slate-600" />
            <div>
              <p className="text-2xl font-semibold">{unassigned}</p>
              <p className="text-xs text-muted-foreground">Without an owner on this page</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Operational pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visibleEnquiries.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Inbox aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">No enquiries match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Change the filters or create a new synthetic enquiry.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {visibleEnquiries.map((enquiry) => (
                <Link
                  className="group grid gap-3 px-5 py-4 transition-colors hover:bg-muted/50 lg:grid-cols-[9rem_minmax(0,1.5fr)_minmax(12rem,0.7fr)_auto] lg:items-center"
                  href={`/enquiries/${enquiry.id}`}
                  key={enquiry.id}
                >
                  <div>
                    <p className="font-mono text-xs font-semibold text-primary">
                      {enquiry.reference}
                    </p>
                    <p className={cn("mt-1 text-xs font-medium", enquiryPriorityTones[enquiry.priority])}>
                      {enquiryPriorityLabels[enquiry.priority]} priority
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium">{enquiry.summary}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {enquiry.customer_name || enquiry.broker_name || enquiry.broker_company_name || "Requester not resolved"}
                      {enquiry.yacht_name ? ` · ${enquiry.yacht_name}` : " · Yacht not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm">
                      {formatDate(enquiry.charter_start_date)}
                      {enquiry.charter_end_date ? ` – ${formatDate(enquiry.charter_end_date)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {enquiry.owner_name || "Unassigned"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <Badge className={enquiryStatusTones[enquiry.status]} variant="outline">
                      {enquiryStatusLabels[enquiry.status]}
                    </Badge>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
          <CursorPagination
            currentCount={visibleEnquiries.length}
            nextCursor={enquiryRegister.nextCursor}
            pathname="/enquiries"
            searchParams={{
              cursor: filters.cursor,
              priority,
              q: search,
              status,
              yacht: yachtId,
            }}
            totalCount={enquiryRegister.totalCount}
          />
        </CardContent>
      </Card>
    </div>
  )
}
