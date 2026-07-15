import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DirectoryTabs({ active }: { active: "companies" | "contacts" }) {
  return (
    <nav aria-label="Contact directory sections" className="flex flex-wrap gap-2">
      <Link
        className={cn(
          buttonVariants({ variant: active === "contacts" ? "secondary" : "outline" }),
        )}
        href="/contacts"
      >
        People
      </Link>
      <Link
        className={cn(
          buttonVariants({ variant: active === "companies" ? "secondary" : "outline" }),
        )}
        href="/contacts/companies"
      >
        Companies
      </Link>
    </nav>
  )
}
