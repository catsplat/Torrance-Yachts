"use client"

import { Table2 } from "lucide-react"
import { useActionState, useState } from "react"

import {
  selectGoogleSpreadsheetAction,
  type AlertSettingsActionState,
} from "@/app/(workspace)/settings/alerts/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Spreadsheet = {
  id: string
  modifiedTime: string | null
  name: string
  webViewLink: string | null
}

const initialState: AlertSettingsActionState = {}

export function GoogleSpreadsheetPicker({
  selectedId,
  selectedName,
}: {
  selectedId: string | null
  selectedName: string | null
}) {
  const [state, action, pending] = useActionState(selectGoogleSpreadsheetAction, initialState)
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[] | null>(null)
  const [selection, setSelection] = useState(selectedId ?? "")
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const selected = spreadsheets?.find((sheet) => sheet.id === selection)

  async function loadSpreadsheets() {
    setLoading(true)
    setLoadError("")
    try {
      const response = await fetch("/api/integrations/google/spreadsheets", {
        cache: "no-store",
      })
      const result = await response.json() as {
        message?: string
        spreadsheets?: Spreadsheet[]
      }
      if (!response.ok || !Array.isArray(result.spreadsheets)) {
        throw new Error(result.message || "Google Sheets could not be loaded.")
      }
      setSpreadsheets(result.spreadsheets)
      setSelection((current) => current || result.spreadsheets?.[0]?.id || "")
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Google Sheets could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Table2 className="size-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Reporting spreadsheet</p>
            <p className="text-xs text-muted-foreground">{selectedName ?? "Not selected"}</p>
          </div>
        </div>
        {selectedId ? <Badge variant="outline">Selected</Badge> : null}
      </div>

      {spreadsheets ? (
        <form action={action} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            Spreadsheet
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              name="spreadsheetId"
              onChange={(event) => setSelection(event.target.value)}
              value={selection}
            >
              {spreadsheets.map((sheet) => <option key={sheet.id} value={sheet.id}>{sheet.name}</option>)}
            </select>
          </label>
          <input name="spreadsheetName" type="hidden" value={selected?.name ?? ""} />
          <div><Button disabled={pending || !selected} type="submit">{pending ? "Saving…" : "Use this spreadsheet"}</Button></div>
        </form>
      ) : (
        <Button disabled={loading} onClick={loadSpreadsheets} type="button" variant="outline">
          {loading ? "Loading…" : "Choose spreadsheet"}
        </Button>
      )}

      {loadError ? <p aria-live="polite" className="text-sm text-destructive">{loadError}</p> : null}
      {state.message ? <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p> : null}
    </div>
  )
}
