export const developmentSimulatorWorkerId = "n8n-development-simulator"

/**
 * The delivery simulator is useful evidence for a local rehearsal, but it is
 * not a provider adapter. Keep the restriction at the application boundary so
 * an accidentally imported n8n workflow cannot mark live deliveries complete.
 */
export function isAllowedAutomationWorker(
  workerId: string,
  environment = process.env.APP_ENVIRONMENT,
) {
  return workerId !== developmentSimulatorWorkerId || environment === "development"
}
