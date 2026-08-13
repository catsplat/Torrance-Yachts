import type { Instrumentation } from "next"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SKIP_RUNTIME_ENV_VALIDATION !== "1") {
    const { validateDeployedServerEnvironment } = await import("@/lib/env/server")
    validateDeployedServerEnvironment()
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const requestId = request.headers["x-request-id"]
  const record = {
    errorClass: error instanceof Error ? error.name : "UnknownError",
    event: "request_error",
    method: request.method,
    path: request.path.split("?", 1)[0],
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
    route: context.routePath,
    routeType: context.routeType,
  }
  console.error(JSON.stringify(record))
}

