import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { expect, test as setup } from "@playwright/test"

const authenticationState = resolve("playwright/.auth/administrator.json")

function requiredEnvironment(name: "E2E_ADMIN_EMAIL" | "E2E_ADMIN_PASSWORD") {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required. Copy .env.e2e.example to .env.e2e.local.`)
  return value
}

setup("authenticate an approved internal administrator", async ({ page }) => {
  const email = requiredEnvironment("E2E_ADMIN_EMAIL")
  const password = requiredEnvironment("E2E_ADMIN_PASSWORD")

  if (process.env.E2E_ALLOW_INITIAL_SETUP === "true") {
    const setupToken = process.env.INITIAL_ADMIN_SETUP_TOKEN?.trim()
    if (!setupToken) throw new Error("INITIAL_ADMIN_SETUP_TOKEN is required for disposable initial setup.")

    await page.goto("/setup")
    await expect(page.getByRole("heading", { name: "Initial administrator setup" })).toBeVisible()
    await page.getByLabel("Display name").fill("Browser Acceptance Administrator")
    await page.getByLabel("Work email").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByLabel("Confirm password").fill(password)
    await page.getByLabel("One-time setup token").fill(setupToken)
    await page.getByRole("button", { name: "Create administrator" }).click()
    await expect(page).toHaveURL(/\/login\?setup=complete$/)
  }

  await page.goto("/login")
  await page.getByLabel("Work email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening),/ })).toBeVisible()

  await mkdir(dirname(authenticationState), { recursive: true })
  await page.context().storageState({ path: authenticationState })
})
