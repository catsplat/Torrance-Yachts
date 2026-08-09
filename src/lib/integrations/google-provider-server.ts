import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  dispatchGoogleCalendar,
  dispatchGoogleDrive,
  dispatchGoogleSheets,
  type GoogleProviderResult,
} from "@/lib/integrations/google-provider"
import type { GoogleWorkspaceCredentials } from "@/lib/integrations/google-workspace"
import type { Database } from "@/types/database"

type AdminClient = SupabaseClient<Database>
type Delivery = Database["public"]["Tables"]["integration_deliveries"]["Row"]
type Connection = Database["public"]["Tables"]["integration_connections"]["Row"]
type FetchImplementation = typeof fetch

export async function getGoogleDispatchCredentials(
  admin: AdminClient,
): Promise<GoogleWorkspaceCredentials> {
  const { data, error } = await admin.rpc("get_active_google_workspace_dispatch_credentials")
  const credentials = data?.[0]
  if (error || !credentials) throw new Error("Connect and select a Google Workspace account.")
  return credentials
}

export async function getGoogleDispatchConnections(admin: AdminClient) {
  const { data, error } = await admin.from("integration_connections")
    .select("*")
    .in("provider", ["google_calendar", "google_drive", "google_sheets"])
  if (error) throw new Error("Google Workspace connection settings are unavailable.")
  return new Map(data.map((connection) => [connection.provider, connection]))
}

async function getDriveFile(admin: AdminClient, delivery: Delivery) {
  const { data: document, error } = await admin.from("documents")
    .select("storage_bucket, storage_path, size_bytes, verification_status, scan_status")
    .eq("id", delivery.source_id)
    .maybeSingle()
  if (
    error || !document || document.verification_status !== "verified" ||
    !["clean", "released"].includes(document.scan_status) ||
    document.size_bytes > 25 * 1024 * 1024
  ) {
    throw new Error("Only a clean, verified document can be copied to Google Drive.")
  }
  const { data: file, error: downloadError } = await admin.storage
    .from(document.storage_bucket)
    .download(document.storage_path)
  if (downloadError || !file) throw new Error("The private source document is unavailable.")
  return new Uint8Array(await file.arrayBuffer())
}

function connectionFor(
  connections: Map<string, Connection>,
  provider: "google_calendar" | "google_drive" | "google_sheets",
) {
  const connection = connections.get(provider)
  if (!connection?.enabled) throw new Error(`${connection?.display_name ?? provider} is disabled.`)
  return connection
}

export async function dispatchGoogleWorkspaceDelivery(
  admin: AdminClient,
  credentials: GoogleWorkspaceCredentials,
  connections: Map<string, Connection>,
  delivery: Delivery,
  signal: AbortSignal,
  request: FetchImplementation = fetch,
): Promise<GoogleProviderResult> {
  if (delivery.operation === "calendar_upsert") {
    const connection = connectionFor(connections, "google_calendar")
    return dispatchGoogleCalendar(
      credentials,
      connection.target_reference || "primary",
      delivery.payload,
      request,
      signal,
    )
  }
  if (delivery.operation === "sheets_snapshot") {
    const connection = connectionFor(connections, "google_sheets")
    return dispatchGoogleSheets(
      credentials,
      connection.target_reference || "",
      delivery.payload,
      request,
      signal,
    )
  }
  if (delivery.operation === "drive_upload") {
    const connection = connectionFor(connections, "google_drive")
    const file = await getDriveFile(admin, delivery)
    return dispatchGoogleDrive(
      credentials,
      connection.target_reference || "",
      delivery.idempotency_key,
      delivery.payload,
      file,
      request,
      signal,
    )
  }
  throw new Error("This delivery is not a Google Workspace operation.")
}
