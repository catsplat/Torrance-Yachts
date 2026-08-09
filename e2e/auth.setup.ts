import { createHmac } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { expect, test as setup } from "@playwright/test"

const authenticationState = resolve("playwright/.auth/administrator.json")
const mfaSecretPath = resolve("playwright/.auth/mfa-secret.txt")

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const character of value.replaceAll("=", "").toUpperCase()) {
    const index = alphabet.indexOf(character)
    if (index < 0) throw new Error("Invalid authenticator setup secret.")
    bits += index.toString(2).padStart(5, "0")
  }
  const bytes = []
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2))
  }
  return Buffer.from(bytes)
}

function totp(secret: string, now = Date.now()) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)))
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest()
  const offset = digest.at(-1)! & 0x0f
  const binary = ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff)
  return String(binary % 1_000_000).padStart(6, "0")
}

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
  await page.getByRole("heading", { name: "Secure your account" })
    .or(page.getByRole("heading", { name: /Good (morning|afternoon|evening),/ }))
    .waitFor()
  if (new URL(page.url()).pathname === "/account/mfa") {
    const finishSetup = page.getByRole("button", { name: "Finish setup" })
    const continueChallenge = page.getByRole("button", { name: "Continue" })
    await finishSetup.or(continueChallenge).waitFor()
    const secret = await finishSetup.isVisible()
      ? (await page.locator("code").textContent())?.trim()
      : (await readFile(mfaSecretPath, "utf8")).trim()
    if (!secret) throw new Error("MFA setup secret is unavailable for acceptance testing.")
    if (await finishSetup.isVisible()) {
      await mkdir(dirname(mfaSecretPath), { recursive: true })
      await writeFile(mfaSecretPath, `${secret}\n`, { encoding: "utf8", mode: 0o600 })
    }
    await page.getByLabel("Authenticator code").fill(totp(secret))
    await page.getByRole("button", { name: /Finish setup|Continue/ }).click()
  }
  await expect(page).toHaveURL((url) => url.pathname === "/")
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening),/ })).toBeVisible()

  await page.goto("/tasks/templates")
  const workflow = page.getByRole("link", { name: /Standard charter booking workflow/ }).first()
  await workflow.click()
  const approve = page.getByRole("button", { name: "Approve as default workflow" })
  const defaultBadge = page.getByText("Default", { exact: true })
  await approve.or(defaultBadge).waitFor()
  if (await approve.isVisible()) {
    await approve.click()
  }
  await expect(defaultBadge).toBeVisible()

  await mkdir(dirname(authenticationState), { recursive: true })
  await page.context().storageState({ path: authenticationState })
})
