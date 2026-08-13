import { createHmac } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { expect, test as setup } from "@playwright/test"

const authenticationState = resolve("playwright/.auth/staff.json")
const mfaSecretPath = resolve("playwright/.auth/staff-mfa-secret.txt")

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const character of value.replaceAll("=", "").toUpperCase()) {
    const index = alphabet.indexOf(character)
    if (index < 0) throw new Error("Invalid staff authenticator setup secret.")
    bits += index.toString(2).padStart(5, "0")
  }
  const bytes = []
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2))
  return Buffer.from(bytes)
}

function totp(secret: string) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)))
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest()
  const offset = digest.at(-1)! & 15
  const binary = ((digest[offset]! & 127) << 24) | (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) | digest[offset + 3]!
  return String(binary % 1_000_000).padStart(6, "0")
}

setup("authenticate an approved staff member", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Work email").fill(process.env.E2E_STAFF_EMAIL!)
  await page.getByLabel("Password").fill(process.env.E2E_STAFF_PASSWORD!)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/account\/mfa$/)
  const finishSetup = page.getByRole("button", { name: "Finish setup" })
  const continueChallenge = page.getByRole("button", { name: "Continue" })
  await finishSetup.or(continueChallenge).waitFor()
  const secret = await finishSetup.isVisible()
    ? (await page.locator("code").textContent())?.trim()
    : (await readFile(mfaSecretPath, "utf8")).trim()
  if (!secret) throw new Error("Staff MFA setup secret is unavailable.")
  if (await finishSetup.isVisible()) {
    await mkdir(dirname(mfaSecretPath), { recursive: true })
    await writeFile(mfaSecretPath, `${secret}\n`, { encoding: "utf8", mode: 0o600 })
  }
  await page.getByLabel("Authenticator code").fill(totp(secret))
  await page.getByRole("button", { name: /Finish setup|Continue/ }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/")
  await mkdir(dirname(authenticationState), { recursive: true })
  await writeFile(resolve("playwright/.auth/staff-mfa-enrolled.txt"), "synthetic factor enrolled\n", { encoding: "utf8", mode: 0o600 })
  await page.context().storageState({ path: authenticationState })
})
