import "server-only"

import { cache } from "react"

import { getCurrentUser } from "@/lib/auth/current-user"
import { createClient } from "@/lib/supabase/server"

export const getTutorialWorkspace = cache(async () => {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error("An authenticated user is required.")
  const [session, history] = await Promise.all([
    supabase.from("tutorial_sessions").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("tutorial_history").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ])
  if (session.error || history.error) throw new Error("Unable to load tutorial progress.")
  return { history: history.data, session: session.data, user }
})

export const getLaunchReadinessWorkspace = cache(async () => {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error("An authenticated user is required.")
  const [checks, summary, backups] = await Promise.all([
    supabase.from("launch_readiness_checks").select("*").order("category").order("title"),
    supabase.rpc("get_launch_readiness_summary"),
    user.role === "administrator"
      ? supabase.from("backup_verifications").select("*")
        .order("created_at", { ascending: false }).limit(30)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (checks.error || summary.error || backups.error) {
    throw new Error("Unable to load launch readiness.")
  }
  return {
    backups: backups.data,
    checks: checks.data,
    configuration: getProductionConfigurationStatus(),
    summary: summary.data as {
      latest_restore_tested_at: string | null
      production_approved: boolean
      required_passed: number
      required_pending: number
      required_total: number
      required_waived: number
    },
    user,
  }
})

export function getProductionConfigurationStatus() {
  const required = [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY],
    ["SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY],
    ["AUTOMATION_SHARED_SECRET", process.env.AUTOMATION_SHARED_SECRET],
    ["MONITORING_SHARED_SECRET", process.env.MONITORING_SHARED_SECRET],
    ["APP_BASE_URL", process.env.APP_BASE_URL],
  ] as const
  return required.map(([name, value]) => ({ configured: Boolean(value?.trim()), name }))
}
