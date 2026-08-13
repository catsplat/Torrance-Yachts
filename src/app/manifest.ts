import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f7faf9",
    description: "Private charter operations workspace for Torrance Yachts.",
    display: "standalone",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
    name: "Torrance Yachts Operations",
    scope: "/",
    short_name: "Torrance Yachts",
    start_url: "/work",
    theme_color: "#082532",
  }
}
