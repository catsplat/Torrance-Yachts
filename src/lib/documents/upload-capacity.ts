import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export async function claimUploadCapacity(userId: string, sizeBytes: number) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("claim_upload_capacity", {
    p_max_bytes_per_hour: 100 * 1024 * 1024,
    p_max_concurrent: 2,
    p_size_bytes: sizeBytes,
    p_user_id: userId,
  })
  return error ? null : data
}

export async function releaseUploadCapacity(leaseId: string) {
  await createAdminClient().rpc("release_upload_capacity", { p_lease_id: leaseId })
}
