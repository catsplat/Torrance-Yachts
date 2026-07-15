import { Card, CardContent } from "@/components/ui/card"

export default function ContactsLoading() {
  return (
    <div className="space-y-5" role="status">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
      <Card>
        <CardContent className="space-y-3 p-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="h-14 animate-pulse rounded-lg bg-muted" key={index} />
          ))}
        </CardContent>
      </Card>
      <span className="sr-only">Loading contact directory</span>
    </div>
  )
}
