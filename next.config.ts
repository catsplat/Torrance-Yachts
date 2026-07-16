import type { NextConfig } from "next";

const isProductionDeployment = process.env.APP_ENVIRONMENT === "production";
const deploymentId = process.env.DEPLOYMENT_VERSION
  ?.replace(/[^a-zA-Z0-9_-]/g, "-")
  .replace(/^-+|-+$/g, "");

const nextConfig: NextConfig = {
  deploymentId: deploymentId || undefined,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Frame-Options", value: "DENY" },
          ...(isProductionDeployment
            ? [{
                key: "Strict-Transport-Security",
                value: "max-age=63072000; includeSubDomains",
              }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
