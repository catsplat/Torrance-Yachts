import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CursorPagination({
  currentCount,
  nextCursor,
  pathname,
  searchParams,
  totalCount,
}: {
  currentCount: number
  nextCursor: string | null
  pathname: string
  searchParams: Record<string, string | undefined>
  totalCount: number
}) {
  if (totalCount === 0) return null

  const params = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && key !== "cursor") params.set(key, value)
  })
  const nextParams = new URLSearchParams(params)
  if (nextCursor) nextParams.set("cursor", nextCursor)

  const nextHref = nextCursor ? `${pathname}?${nextParams.toString()}` : null
  const firstHref = params.size ? `${pathname}?${params.toString()}` : pathname

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-sm">
      <p className="text-muted-foreground">
        Showing {currentCount} record{currentCount === 1 ? "" : "s"} on this page · {totalCount} matching in total
      </p>
      <div className="flex items-center gap-2">
        {searchParams.cursor ? (
          <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }))} href={firstHref}>
            First page
          </Link>
        ) : null}
        {nextHref ? (
          <Link className={cn(buttonVariants({ size: "sm" }))} href={nextHref}>
            Next page
          </Link>
        ) : null}
      </div>
    </div>
  )
}
