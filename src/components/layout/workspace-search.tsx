import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

export function WorkspaceSearch() {
  return (
    <form action="/search" className="relative hidden w-full max-w-md md:block">
      <Search
        aria-hidden="true"
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="Search the workspace"
        className="h-9 bg-card pl-9"
        minLength={2}
        name="q"
        placeholder="Search enquiries, bookings, yachts..."
        required
        type="search"
      />
    </form>
  )
}
