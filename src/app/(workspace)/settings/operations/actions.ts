"use server"

import { revalidatePath } from "next/cache"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import { createAdminClient } from "@/lib/supabase/admin"

export type OperationsActionState = { message?: string; success?: boolean }

export async function reconcileQuarantineAction(
  _state: OperationsActionState,
  _formData: FormData,
): Promise<OperationsActionState> {
  void _state
  void _formData
  const context = await getAuthenticatedRequestContext()
  if (!context || context.role !== "administrator") return { message: "Administrator access is required." }
  const admin = createAdminClient()
  const { data, error } = await admin.from("documents")
    .select("id, storage_path")
    .is("quarantine_removed_at", null)
    .or("storage_bucket.eq.booking-private,scan_status.eq.infected,verification_status.eq.rejected")
    .order("created_at")
    .limit(100)
  if (error) return { message: "Quarantine reconciliation could not be prepared." }
  let recovered = 0
  for (const document of data) {
    const removed = await admin.storage.from("booking-quarantine").remove([document.storage_path])
    if (removed.error) continue
    const recorded = await admin.rpc("mark_document_quarantine_removed", {
      p_document_id: document.id,
      p_reason: "Administrator reconciliation confirmed the obsolete quarantine copy is absent.",
    })
    if (!recorded.error) recovered += 1
  }
  revalidatePath("/settings/operations")
  return { message: `${recovered} quarantine record${recovered === 1 ? "" : "s"} reconciled.`, success: true }
}
