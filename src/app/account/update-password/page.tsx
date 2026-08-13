import { KeyRound } from "lucide-react"

import { PasswordUpdateForm } from "@/components/auth/password-update-form"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

export default function UpdatePasswordPage() {
  return <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><KeyRound className="size-5" /></div><h1 className="font-heading text-base leading-snug font-medium">Set a new password</h1><CardDescription>This page requires a valid invitation or administrator-initiated recovery session.</CardDescription></CardHeader><CardContent><PasswordUpdateForm /></CardContent></Card></main>
}
