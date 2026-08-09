import { createHmac } from "node:crypto"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { expect, test } from "@playwright/test"

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const character of value.replaceAll("=", "").toUpperCase()) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, "0")
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

test("a normal staff login must complete the authenticator challenge", async ({ page }) => {
  const secret = (await readFile(resolve("playwright/.auth/mfa-secret.txt"), "utf8")).trim()
  await page.goto("/login")
  await page.getByLabel("Work email").fill(process.env.E2E_ADMIN_EMAIL!)
  await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/account\/mfa$/)
  await page.getByLabel("Authenticator code").fill(totp(secret))
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page).toHaveURL(/\/$/)
})
