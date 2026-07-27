import { readdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"

const workflowDirectory = resolve("automation", "workflows")
const files = (await readdir(workflowDirectory))
  .filter((file) => file.endsWith(".json"))
  .sort()

if (files.length === 0) throw new Error("No automation workflows were found.")

const workflows = await Promise.all(files.map(async (file) => ({
  file,
  workflow: JSON.parse(await readFile(resolve(workflowDirectory, file), "utf8")),
})))

const valuesAreUnique = (values) => new Set(values).size === values.length
const ids = workflows.map(({ workflow }) => workflow.id)
const names = workflows.map(({ workflow }) => workflow.name)

if (ids.some((id) => typeof id !== "string" || id.length < 8)) {
  throw new Error("Every workflow requires a stable top-level ID for repeatable imports.")
}
if (!valuesAreUnique(ids)) throw new Error("Workflow IDs must be unique.")
if (!valuesAreUnique(names)) throw new Error("Workflow names must be unique.")

for (const { file, workflow } of workflows) {
  if (workflow.active !== false) throw new Error(`${file} must be inactive in source control.`)
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    throw new Error(`${file} has no nodes.`)
  }
  if (workflow.nodes.some((node) => node.credentials && Object.keys(node.credentials).length > 0)) {
    throw new Error(`${file} contains a credential reference.`)
  }
  const nodeIds = workflow.nodes.map((node) => node.id)
  if (nodeIds.some((id) => typeof id !== "string" || id.length < 8) || !valuesAreUnique(nodeIds)) {
    throw new Error(`${file} requires unique stable node IDs.`)
  }
}

const byName = (name) => workflows.find(({ workflow }) => workflow.name === name)?.workflow
const core = byName("Torrance Yachts - Core scheduler")
const simulator = byName("Torrance Yachts - DEVELOPMENT delivery simulator")
const readiness = byName("Torrance Yachts - Readiness monitor")
const gmail = byName("Torrance Yachts - Gmail ingestion")
const gmailMarkRead = byName("Torrance Yachts - Gmail mark-read worker")
const gmailArchive = byName("Torrance Yachts - Gmail archive worker")

if (!core || !simulator || !readiness || !gmail || !gmailMarkRead || !gmailArchive) {
  throw new Error("The required scheduler, simulator, readiness, Gmail intake, and Gmail action workflows must all be present.")
}

const serialisedCore = JSON.stringify(core)
if (!serialisedCore.includes("/api/integrations/automation/tick") ||
    !serialisedCore.includes("/api/integrations/automation/dispatch-alerts")) {
  throw new Error("The core scheduler must materialise work and dispatch internal alerts.")
}

const serialisedSimulator = JSON.stringify(simulator)
if (!simulator.nodes.some((node) => node.type === "n8n-nodes-base.manualTrigger") ||
    !serialisedSimulator.includes("n8n-development-simulator")) {
  throw new Error("The development simulator must be manual and use its blocked worker identity.")
}

if (!JSON.stringify(readiness).includes("/api/health/ready")) {
  throw new Error("The readiness monitor must call the authenticated readiness endpoint.")
}

const gmailTrigger = gmail.nodes.find((node) => node.type === "n8n-nodes-base.gmailTrigger")
const gmailSubmit = gmail.nodes.find((node) => node.name === "Store through application boundary")
if (!gmailTrigger || gmailTrigger.parameters?.simple !== false ||
    gmailTrigger.parameters?.options?.downloadAttachments !== false) {
  throw new Error("Gmail intake must read full text without downloading attachments.")
}
const serialisedGmailSubmit = JSON.stringify(gmailSubmit ?? {})
if (!serialisedGmailSubmit.includes("/api/integrations/gmail/n8n-message") ||
    !serialisedGmailSubmit.includes("EMAIL_INGESTION_TOKEN") ||
    gmailSubmit?.retryOnFail !== true) {
  throw new Error("Gmail intake must use the authenticated, retryable application boundary.")
}

for (const [workflow, operation] of [
  [gmailMarkRead, "gmail_mark_read"],
  [gmailArchive, "gmail_archive"],
]) {
  const serialised = JSON.stringify(workflow)
  const claimNode = workflow.nodes.find((node) => node.name.startsWith("Claim "))
  const claimBody = JSON.parse(claimNode?.parameters?.jsonBody?.replace(/^=/, "") ?? "{}")
  if (JSON.stringify(claimBody.operations) !== JSON.stringify([operation]) ||
      !serialised.includes("/api/integrations/deliveries/claim") ||
      !serialised.includes("/complete") ||
      !serialised.includes("/fail")) {
    throw new Error(`${operation} must use scoped leasing and record both outcomes.`)
  }
}

console.log(`Validated ${workflows.length} inactive, credential-free automation workflows.`)
