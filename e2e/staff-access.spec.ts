import { expect, test } from "@playwright/test"

test("staff can operate the workspace but cannot open administrator registers", async ({ page }) => {
  await page.goto("/work")
  await expect(page.getByRole("heading", { name: "Work queue" })).toBeVisible()

  for (const route of [
    "/settings/users",
    "/settings/audit",
    "/settings/activation",
    "/settings/integrations",
    "/settings/invoices",
    "/settings/launch",
    "/settings/operations",
    "/settings/readiness",
    "/settings/rehearsal",
  ]) {
    await page.goto(route)
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
  }
})
