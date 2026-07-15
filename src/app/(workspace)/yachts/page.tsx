import { ArrowRight, Plus, Ruler, Ship, Wrench } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

const statusStyles = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  inactive: "border-slate-200 bg-slate-100 text-slate-700",
  maintenance: "border-amber-200 bg-amber-50 text-amber-800",
} as const

export default async function YachtsPage() {
  const supabase = await createClient()
  const { data: yachts, error } = await supabase
    .from("yachts")
    .select("id, name, builder, year_built, length_metres, guest_capacity, home_port, status, updated_at")
    .order("name")

  if (error) {
    throw new Error("Unable to load yacht records.")
  }

  const activeCount = yachts.filter((yacht) => yacht.status === "active").length
  const maintenanceCount = yachts.filter((yacht) => yacht.status === "maintenance").length

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Fleet records</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Yachts</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            The operational yacht register. Availability will be derived from bookings rather than edited here.
          </p>
        </div>
        <Link className={cn(buttonVariants({ size: "lg" }))} href="/yachts/new">
          <Plus aria-hidden="true" /> Add yacht
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-5"><Ship className="size-5 text-primary" aria-hidden="true" /><div><p className="text-2xl font-semibold">{yachts.length}</p><p className="text-xs text-muted-foreground">Total records</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Ruler className="size-5 text-emerald-700" aria-hidden="true" /><div><p className="text-2xl font-semibold">{activeCount}</p><p className="text-xs text-muted-foreground">Operationally active</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><Wrench className="size-5 text-amber-700" aria-hidden="true" /><div><p className="text-2xl font-semibold">{maintenanceCount}</p><p className="text-xs text-muted-foreground">In maintenance</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle>Fleet register</CardTitle></CardHeader>
        <CardContent className="p-0">
          {yachts.length === 0 ? (
            <div className="px-6 py-14 text-center"><Ship className="mx-auto size-8 text-muted-foreground" aria-hidden="true" /><p className="mt-3 font-medium">No yachts yet</p><p className="mt-1 text-sm text-muted-foreground">Add the first yacht to begin the operational register.</p></div>
          ) : (
            <div className="divide-y">
              {yachts.map((yacht) => (
                <Link key={yacht.id} href={`/yachts/${yacht.id}`} className="group grid gap-3 px-5 py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-medium">{yacht.name}</p><Badge variant="outline" className={statusStyles[yacht.status]}>{yacht.status}</Badge></div><p className="mt-1 truncate text-sm text-muted-foreground">{[yacht.builder, yacht.year_built].filter(Boolean).join(" · ") || "Builder not recorded"}</p></div>
                  <div className="text-sm text-muted-foreground"><p>{yacht.length_metres ? `${yacht.length_metres} m` : "Length not recorded"}</p><p className="mt-1">{yacht.guest_capacity ? `${yacht.guest_capacity} guests` : "Guest capacity not recorded"}{yacht.home_port ? ` · ${yacht.home_port}` : ""}</p></div>
                  <ArrowRight className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
