import { expect, test } from "@playwright/test"

test("administrator can create, inspect, and reset an isolated five-route rehearsal", async ({ page }) => {
  await page.goto("/settings/rehearsal")
  await expect(page.getByRole("heading", { name: "Offline workflow rehearsal" })).toBeVisible()

  await page.getByRole("button", { name: "Create five-route rehearsal suite" }).click()
  await expect(page.getByText(/Five fictional email routes were created/)).toBeVisible()

  const reviewHref = await page.getByRole("link", { name: "Open the synthetic enquiry review" }).getAttribute("href")
  expect(reviewHref).toMatch(/^\/emails\/[0-9a-f-]+$/)
  const reviewPage = await page.context().newPage()
  await reviewPage.goto(reviewHref!)
  await expect(reviewPage.getByRole("heading", { name: "Offline rehearsal: August family charter enquiry" })).toBeVisible()

  await reviewPage.goto("/emails?classification=circular")
  await expect(reviewPage.getByRole("heading", { name: "Inbox" })).toBeVisible()
  await expect(reviewPage.getByText("Offline rehearsal: weekly charter news").first()).toBeVisible()
  await reviewPage.close()

  const activeRun = page.getByText("Five-route fictional workflow rehearsal", { exact: true }).first()
  await expect(activeRun).toBeVisible()
  const runCard = activeRun.locator("xpath=ancestor::form")
  await runCard.getByRole("button", { name: "Remove this fictional run" }).click()
  await expect(page.getByText("The fictional run was removed. Its reset audit evidence remains.")).toBeVisible()
})

test("administrator can complete and reset the full fictional charter lifecycle", async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto("/settings/rehearsal")
  await page.getByRole("button", { name: "Create full charter rehearsal" }).click()
  await expect(page.getByText(/Full fictional charter rehearsal created/)).toBeVisible()

  await page.getByRole("button", { name: "Rehearse compliance and contract review" }).click()
  await expect(page.getByText(/Fictional KYC, passport, CDD, and signed agreement completed/)).toBeVisible()

  await page.getByRole("button", { name: "Rehearse post-contract charter lifecycle" }).click()
  await expect(page.getByText(/Fictional invoice evidence, Yachtfolio confirmation/)).toBeVisible()
  const bookingHref = await page.getByRole("link", { name: "Open completed fictional booking" }).getAttribute("href")
  expect(bookingHref).toMatch(/^\/bookings\/[0-9a-f-]+$/)

  await page.goto(bookingHref!)
  await expect(page.getByRole("heading", { name: /charter$/ })).toBeVisible()
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible()
  if (process.env.CAPTURE_PORTFOLIO_SCREENSHOTS === "true") {
    await page.screenshot({
      fullPage: true,
      path: "docs/screenshots/v0.19.0-fictional-booking.png",
    })
  }

  await page.goto("/settings/rehearsal")
  const fullRun = page.getByText("Full fictional charter rehearsal", { exact: true }).first()
  await expect(fullRun).toBeVisible()
  await fullRun.locator("xpath=ancestor::form").getByRole("button", { name: "Remove this fictional run" }).click()
  await expect(page.getByText("The fictional run was removed. Its reset audit evidence remains.")).toBeVisible()
})
