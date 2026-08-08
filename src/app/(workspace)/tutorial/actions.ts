"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthenticatedRequestContext } from "@/lib/auth/request-context"
import {
  backupVerificationSchema,
  launchCheckReviewSchema,
  tutorialAdvanceSchema,
} from "@/lib/tutorial/validation"

export type PhaseTwelveActionState = {
  message?: string
  success?: boolean
}

const expired = { message: "Your session has expired. Sign in again." }

async function contextOrMessage() {
  const context = await getAuthenticatedRequestContext()
  return context ?? expired
}

function refreshTutorial() {
  revalidatePath("/tutorial")
  revalidatePath("/settings")
}

export async function startTutorialAction() {
  const context = await getAuthenticatedRequestContext()
  if (!context) redirect("/login")
  const { error } = await context.supabase.rpc("start_tutorial")
  if (error) redirect("/tutorial?error=start")
  redirect("/tutorial")
}

export async function pauseTutorialAction() {
  const context = await getAuthenticatedRequestContext()
  if (!context) redirect("/login")
  const { error } = await context.supabase.rpc("pause_tutorial")
  if (error) redirect("/tutorial?error=pause")
  redirect("/tutorial")
}

export async function advanceTutorialAction(
  _state: PhaseTwelveActionState,
  formData: FormData,
): Promise<PhaseTwelveActionState> {
  const parsed = tutorialAdvanceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: "The tutorial transition is invalid." }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("advance_tutorial", {
    p_event_type: parsed.data.eventType,
    p_stage: parsed.data.practiceStage,
    p_step: parsed.data.step,
  })
  if (error) return { message: "Complete the current practice step before continuing." }
  refreshTutorial()
  return { message: "Practice workflow advanced.", success: true }
}

export async function resetTutorialAction(
  _state: PhaseTwelveActionState,
  _formData: FormData,
): Promise<PhaseTwelveActionState> {
  void _formData
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("reset_tutorial", {
    p_reason: "Tutorial restarted",
  })
  if (error) return { message: "The tutorial could not be reset." }
  refreshTutorial()
  return { message: "Tutorial restarted.", success: true }
}

export async function reviewLaunchCheckAction(
  _state: PhaseTwelveActionState,
  formData: FormData,
): Promise<PhaseTwelveActionState> {
  const parsed = launchCheckReviewSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Review the launch evidence." }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("update_launch_readiness_check", {
    p_check_key: parsed.data.checkKey,
    p_evidence: parsed.data.evidence,
    p_reason: parsed.data.reason,
    p_status: parsed.data.status,
  })
  if (error) return { message: "Only an administrator can update launch acceptance." }
  revalidatePath("/settings/launch")
  return { message: "Launch check updated with audit evidence.", success: true }
}

export async function recordBackupVerificationAction(
  _state: PhaseTwelveActionState,
  formData: FormData,
): Promise<PhaseTwelveActionState> {
  const parsed = backupVerificationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Review the backup evidence." }
  const context = await contextOrMessage()
  if ("message" in context) return context
  const { error } = await context.supabase.rpc("record_backup_verification", {
    p_artifact_reference: parsed.data.artifactReference,
    p_checksum_sha256: parsed.data.checksumSha256,
    p_completed_at: parsed.data.status === "started" ? null as unknown as string : parsed.data.completedAt,
    p_environment: parsed.data.environment,
    p_notes: parsed.data.notes,
    p_restore_tested_at: parsed.data.restoreTestedAt || null as unknown as string,
    p_scope: parsed.data.scope,
    p_started_at: parsed.data.startedAt,
    p_status: parsed.data.status,
  })
  if (error) return { message: "Only valid administrator-reviewed backup evidence can be recorded." }
  revalidatePath("/settings/launch")
  return { message: "Backup and restore evidence recorded.", success: true }
}
