import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { YachtForm } from "@/components/yachts/yacht-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewYachtPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/yachts"><ArrowLeft className="size-4" aria-hidden="true" />Back to yachts</Link>
      <Card>
        <CardHeader><CardTitle>Add yacht</CardTitle><CardDescription>Create an operational record using non-sensitive yacht details. Commercial terms and documents are added in later controlled slices.</CardDescription></CardHeader>
        <CardContent><YachtForm mode="create" /></CardContent>
      </Card>
    </div>
  )
}
