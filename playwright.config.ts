import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { defineConfig, devices } from "@playwright/test"

for (const filename of [".env.e2e.local", ".env.local"]) {
  const path = resolve(filename)
  if (existsSync(path)) process.loadEnvFile(path)
}

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000"
const authenticationState = resolve("playwright/.auth/administrator.json")
const invitationAuthenticationState = resolve("playwright/.auth/invitation-administrator.json")
const staffAuthenticationState = resolve("playwright/.auth/staff.json")

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  outputDir: "test-results",
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  timeout: 45_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    env: { ...process.env, MFA_ENFORCEMENT_ENABLED: "true", NEXT_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `${baseURL}/login`,
  },
  workers: 1,
  projects: [
    {
      name: "access-chromium",
      testMatch: /(^|[\\/])access\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticate",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticate-invitation",
      testMatch: /invitation\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticate-staff",
      testMatch: /staff\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      dependencies: ["authenticate-staff"],
      name: "staff-chromium",
      testMatch: /staff-access\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: staffAuthenticationState },
    },
    {
      dependencies: ["authenticate"],
      name: "mfa-challenge",
      testMatch: /mfa-challenge\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      dependencies: ["authenticate-invitation"],
      name: "invitation-chromium",
      testMatch: /invitation\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: invitationAuthenticationState },
    },
    {
      dependencies: ["authenticate"],
      name: "chromium",
      testMatch: /workspace\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: authenticationState },
    },
    {
      dependencies: ["authenticate"],
      name: "firefox",
      testMatch: /workspace\.spec\.ts/,
      use: { ...devices["Desktop Firefox"], storageState: authenticationState },
    },
    {
      dependencies: ["authenticate"],
      name: "webkit",
      testMatch: /workspace\.spec\.ts/,
      use: { ...devices["Desktop Safari"], storageState: authenticationState },
    },
    {
      dependencies: ["authenticate"],
      name: "workflow-chromium",
      testMatch: /workflow\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: authenticationState },
    },
    {
      dependencies: ["authenticate"],
      name: "mobile-review",
      testMatch: /mobile-review\.spec\.ts/,
      use: { ...devices["iPhone 13"], storageState: authenticationState },
    },
  ],
})
