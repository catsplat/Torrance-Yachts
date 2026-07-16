import packageJson from "../../../../../package.json"

export function GET() {
  return Response.json(
    {
      service: "torrance-yachts-platform",
      status: "ok",
      version: packageJson.version,
    },
    {
      headers: { "Cache-Control": "no-store" },
      status: 200,
    },
  )
}
