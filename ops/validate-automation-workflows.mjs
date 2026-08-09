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

if (!core || !simulator || !readiness || workflows.length !== 3) {
  throw new Error("Only the scheduler, development simulator, and readiness monitor may be stored as n8n workflows.")
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

if (workflows.some(({ workflow }) =>
  JSON.stringify(workflow).toLowerCase().includes("gmail") ||
  workflow.nodes.some((node) => node.type?.toLowerCase().includes("gmail")))) {
  throw new Error("Gmail credentials and operations belong to the application OAuth adapter, not n8n.")
}

console.log(`Validated ${workflows.length} inactive, credential-free automation workflows.`)
