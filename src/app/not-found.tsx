import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-teal-700">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This workspace page has not been created.
        </p>
        <Link
          href="/"
          className={buttonVariants({
            variant: "outline",
            className: "mt-5",
          })}
        >
          <ArrowLeft aria-hidden="true" />
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
