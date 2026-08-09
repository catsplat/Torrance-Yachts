import { expect, test } from "@playwright/test"

test("operational routes require authentication", async ({ page }) => {
  await page.goto("/bookings")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
})

test("invalid credentials fail without disclosing account state", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Work email").fill("not-approved@example.test")
  await page.getByLabel("Password").fill("invalid-password")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page.getByText("The email address or password was not recognised.", { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})
