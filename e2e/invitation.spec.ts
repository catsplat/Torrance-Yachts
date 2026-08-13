import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

import { waitForMailpitConfirmationLink } from "./helpers/mailpit"

const initialPassword = "Invite-Password!2026"
const recoveredPassword = "Recovered-Password!2026"

test("an administrator invitation and recovery email establish a server-side password session", async ({ browser, page }) => {
  test.setTimeout(120_000)
  const email = `invited-${randomUUID()}@example.test`

  await page.goto("/settings/users")
  await page.getByLabel("Name").fill("Invited browser staff")
  await page.getByLabel("Work email").fill(email)
  await page.getByRole("button", { name: "Send invitation" }).click()
  await expect(page.getByText("Invitation sent.", { exact: true })).toBeVisible()

  const invitationLink = await waitForMailpitConfirmationLink(email, "invite")
  expect(invitationLink.hash).toBe("")
  expect(invitationLink.searchParams.get("token_hash")).toBeTruthy()
  expect(invitationLink.searchParams.get("next")).toBe("/account/update-password")

  const invitedContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const invitedPage = await invitedContext.newPage()
  await invitedPage.goto(invitationLink.toString())
  await expect(invitedPage).toHaveURL((url) => url.pathname === "/account/update-password")
  await expect(invitedPage).not.toHaveURL(/recovery=invalid/)
  await expect(invitedPage.getByRole("heading", { name: "Set a new password" })).toBeVisible()

  await invitedPage.getByLabel("New password").fill(initialPassword)
  await invitedPage.getByLabel("Confirm password").fill(initialPassword)
  await invitedPage.getByRole("button", { name: "Update password" }).click()
  await expect(invitedPage).toHaveURL(/\/login\?recovery=complete$/)

  await invitedPage.getByLabel("Work email").fill(email)
  await invitedPage.getByLabel("Password").fill(initialPassword)
  await invitedPage.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(invitedPage).toHaveURL(/\/account\/mfa$/)

  await page.goto("/settings/users")
  const account = page.getByText(email, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'lg:grid-cols')][1]")
  await account.getByRole("button", { name: "Send recovery email" }).click()
  await expect(account.getByText(/Recovery email requested without revealing account status/)).toBeVisible()

  const recoveryLink = await waitForMailpitConfirmationLink(email, "recovery")
  expect(recoveryLink.hash).toBe("")
  expect(recoveryLink.searchParams.get("token_hash")).toBeTruthy()
  expect(recoveryLink.searchParams.get("next")).toBe("/account/update-password")

  const recoveryContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const recoveryPage = await recoveryContext.newPage()
  await recoveryPage.goto(recoveryLink.toString())
  await expect(recoveryPage).toHaveURL((url) => url.pathname === "/account/update-password")
  await expect(recoveryPage).not.toHaveURL(/recovery=invalid/)
  await recoveryPage.getByLabel("New password").fill(recoveredPassword)
  await recoveryPage.getByLabel("Confirm password").fill(recoveredPassword)
  await recoveryPage.getByRole("button", { name: "Update password" }).click()
  await expect(recoveryPage).toHaveURL(/\/login\?recovery=complete$/)

  await recoveryPage.getByLabel("Work email").fill(email)
  await recoveryPage.getByLabel("Password").fill(recoveredPassword)
  await recoveryPage.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(recoveryPage).toHaveURL(/\/account\/mfa$/)

  const invalidContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const invalidPage = await invalidContext.newPage()
  await invalidPage.goto("/auth/confirm?next=/account/update-password&token_hash=not-a-valid-token&type=recovery")
  await expect(invalidPage).toHaveURL(/\/login\?recovery=invalid$/)

  await Promise.all([invitedContext.close(), recoveryContext.close(), invalidContext.close()])
})
