import { ArrowRight, Banknote, CalendarClock, ClipboardCheck, FileSignature, Inbox } from "lucide-react"
import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"

const views = [
  { description: "Messages waiting for classification or approval.", href: "/emails?review=true", icon: Inbox, title: "Inbox review" },
  { description: "Inactive enquiries ready for review or archive.", href: "/enquiries?stale=true", icon: CalendarClock, title: "Stale enquiries" },
  { description: "Draft and approved offers needing a decision.", href: "/offers?status=draft", icon: FileSignature, title: "Offers awaiting action" },
  { description: "Confirmed charters with outstanding preparation.", href: "/tasks?status=ready", icon: ClipboardCheck, title: "Booking preparation" },
  { description: "Instalments and payment tasks past their due date.", href: "/tasks?due=overdue", icon: Banknote, title: "Overdue payments" },
  { description: "Broker references and commission work after charter.", href: "/tasks?q=follow-up", icon: ArrowRight, title: "Post-charter follow-up" },
]

export default function WorkPage() {
  return <div className="mx-auto max-w-6xl space-y-5"><div><h1 className="text-3xl font-semibold">Work queue</h1><p className="mt-2 text-sm text-muted-foreground">Daily views arranged in workflow order.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{views.map(({ description, href, icon: Icon, title }) => <Link href={href} key={title}><Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30"><CardContent className="flex gap-3 pt-5"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></div><div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></CardContent></Card></Link>)}</div></div>
}
