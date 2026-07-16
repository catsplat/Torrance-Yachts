import type { Enums } from "@/types/database"

export type TutorialStep = {
  anchor: string
  eventType: string
  explanation: string
  humanControl: string
  id: number
  practiceStage: Enums<"tutorial_practice_stage">
  route: string
  title: string
}

export const tutorialSteps: TutorialStep[] = [
  {
    anchor: "dashboard-overview",
    eventType: "dashboard_reviewed",
    explanation:
      "The dashboard is the daily control centre for ageing enquiries, approvals, tasks, payments, missing documents, upcoming charters, and automation failures.",
    humanControl:
      "The dashboard reports authoritative records; it does not make booking or communication decisions.",
    id: 0,
    practiceStage: "email_received",
    route: "/",
    title: "Start with the operational dashboard",
  },
  {
    anchor: "email-inbox",
    eventType: "email_classified",
    explanation:
      "A synthetic broker email is classified as a new enquiry. Circulars can be routed deterministically, while uncertain messages wait for review.",
    humanControl:
      "AI can suggest a category and summary, but staff approve uncertain classifications.",
    id: 1,
    practiceStage: "classified",
    route: "/emails",
    title: "Review the incoming email",
  },
  {
    anchor: "enquiry-create",
    eventType: "enquiry_created",
    explanation:
      "Approved email facts become a structured enquiry linked to the broker, customer, yacht, dates, ports, guests, priority, and owner.",
    humanControl:
      "Staff check every extracted fact before it becomes operational data.",
    id: 2,
    practiceStage: "enquiry_created",
    route: "/enquiries",
    title: "Create and own the enquiry",
  },
  {
    anchor: "offer-create",
    eventType: "offer_prepared",
    explanation:
      "The offer uses the selected yacht's approved commercial profile, current seasonal rate, sales material, and versioned response template.",
    humanControl:
      "The application prepares a reviewable snapshot; a person approves it and records when it was sent.",
    id: 3,
    practiceStage: "offer_prepared",
    route: "/offers",
    title: "Prepare the yacht-specific offer",
  },
  {
    anchor: "document-register",
    eventType: "contract_reviewed",
    explanation:
      "The signed agreement and compliance files stay private. Selected contract clauses can be extracted into a proposal with exact source evidence.",
    humanControl:
      "A person verifies the signed agreement and approves dates, fees, tax, commission, and instalments.",
    id: 4,
    practiceStage: "contract_reviewed",
    route: "/documents",
    title: "Verify documents and contract facts",
  },
  {
    anchor: "booking-register",
    eventType: "booking_confirmed",
    explanation:
      "A booking is created only after all signatures are confirmed. The yacht is reserved with the required 24-hour buffer on both sides.",
    humanControl:
      "Booking confirmation is always a deliberate authenticated command, never an AI or email side effect.",
    id: 5,
    practiceStage: "booking_confirmed",
    route: "/bookings",
    title: "Confirm the booking and protect availability",
  },
  {
    anchor: "task-register",
    eventType: "compliance_completed",
    explanation:
      "The numbered KYC, contract, invoice, Yachtfolio, captain, payment, charter, and follow-up tasks are generated from an approved dependency template.",
    humanControl:
      "Staff provide evidence, complete or reopen tasks, adjust allowed dates with reasons, and can add audited ad-hoc work.",
    id: 6,
    practiceStage: "compliance_completed",
    route: "/tasks",
    title: "Work through compliance and dependencies",
  },
  {
    anchor: "calendar-register",
    eventType: "operations_ready",
    explanation:
      "Charter dates, payment instalments, and task deadlines appear in the internal calendar from PostgreSQL and can be copied safely to Google Calendar.",
    humanControl:
      "The database date remains authoritative if an external calendar is unavailable.",
    id: 7,
    practiceStage: "operations_ready",
    route: "/calendar",
    title: "Prepare payments and charter operations",
  },
  {
    anchor: "integration-approvals",
    eventType: "charter_started",
    explanation:
      "Telegram messages, Gmail drafts, Drive copies, Sheets snapshots, and Calendar records use one observable, retry-safe delivery queue.",
    humanControl:
      "Consequential messages remain held for human approval and n8n cannot change booking state.",
    id: 8,
    practiceStage: "charter_active",
    route: "/integrations",
    title: "Approve notifications and start the charter",
  },
  {
    anchor: "booking-register",
    eventType: "charter_completed",
    explanation:
      "At charter end, staff complete the booking lifecycle and any outstanding operational tasks. The reservation and history remain auditable.",
    humanControl:
      "The user records what actually happened; scheduled dates alone never prove completion.",
    id: 9,
    practiceStage: "charter_completed",
    route: "/bookings",
    title: "Complete the charter",
  },
  {
    anchor: "task-register",
    eventType: "follow_up_completed",
    explanation:
      "Two days after charter end, the broker reference follow-up and broker commission-document task become due.",
    humanControl:
      "Staff review the follow-up wording and record the invoice/document outcome.",
    id: 10,
    practiceStage: "follow_up_completed",
    route: "/tasks",
    title: "Finish the broker follow-up",
  },
  {
    anchor: "launch-readiness",
    eventType: "launch_controls_reviewed",
    explanation:
      "Audit history, delivery failures, backup evidence, retention rules, training, and launch acceptance make the workflow recoverable and accountable.",
    humanControl:
      "Production remains blocked until every required launch check has evidence and client sign-off.",
    id: 11,
    practiceStage: "follow_up_completed",
    route: "/settings/launch",
    title: "Understand audit, recovery, and launch controls",
  },
]

export function getTutorialStep(step: number) {
  return tutorialSteps.find((item) => item.id === step) ?? tutorialSteps[0]
}
