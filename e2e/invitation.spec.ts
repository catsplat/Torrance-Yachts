import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

const initialPassword = "Invite-Password!2026"
const recoveredPassword = "Recovered-Password!2026"

test("manual invitation and recovery links establish a server-side password session across browsers", async ({ browser, page }) => {
  test.setTimeout(120_000)
  const email = `invited-${randomUUID()}@example.test`

  await page.goto("/settings/users")
  await page.getByLabel("Name").fill("Invited browser staff")
  await page.getByLabel("Work email").fill(email)
  await page.getByRole("button", { name: "Generate invite link" }).click()
  await expect(page.getByText("Invitation link generated. Send it to the invitee through a secure channel.", { exact: true })).toBeVisible()
  const invitationLink = new URL(await page.getByLabel("One-time account link").inputValue())
  expect(invitationLink.pathname).toMatch(/^\/auth\/setup\/[0-9a-f-]{36}$/)

  // A link-preview request must not consume the one-time token.
  const previewContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const previewPage = await previewContext.newPage()
  await previewPage.goto(invitationLink.toString())
  await expect(previewPage.getByText("Set up your Torrance Yachts account", { exact: true })).toBeVisible()
  await previewContext.close()

  const invitedContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const invitedPage = await invitedContext.newPage()
  await invitedPage.goto(invitationLink.toString())
  await invitedPage.getByRole("button", { name: "Continue to account setup" }).click()
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
  await account.getByRole("button", { name: "Generate recovery link" }).click()
  await expect(account.getByText("Recovery link generated. Send it to the user through a secure channel.", { exact: true })).toBeVisible()
  const recoveryLink = new URL(await account.getByLabel("One-time account link").inputValue())
  expect(recoveryLink.pathname).toMatch(/^\/auth\/setup\/[0-9a-f-]{36}$/)

  const recoveryContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const recoveryPage = await recoveryContext.newPage()
  await recoveryPage.goto(recoveryLink.toString())
  await recoveryPage.getByRole("button", { name: "Continue to password reset" }).click()
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
  await invalidPage.goto("/auth/setup/00000000-0000-4000-8000-000000000000")
  await expect(invalidPage).toHaveURL(/\/login\?recovery=invalid$/)

  await Promise.all([invitedContext.close(), recoveryContext.close(), invalidContext.close()])
})
