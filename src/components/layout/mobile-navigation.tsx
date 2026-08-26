"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { PrimaryNavigation } from "@/components/layout/primary-navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Open navigation"
            className="lg:hidden"
          />
        }
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="h-dvh max-h-dvh w-[19rem] border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <SheetHeader className="shrink-0 border-b border-sidebar-border px-5 py-5">
          <SheetTitle className="text-sidebar-foreground">
            Torrance Yachts
          </SheetTitle>
          <SheetDescription className="text-sidebar-foreground/60">
            Charter operations
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
          <PrimaryNavigation onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
