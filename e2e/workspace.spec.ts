import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const operationalRoutes = [
  { heading: "Inbox", path: "/emails" },
  { heading: "Enquiries", path: "/enquiries" },
  { heading: "Bookings", path: "/bookings" },
  { heading: "Tasks", path: "/tasks" },
  { heading: "Settings", path: "/settings" },
] as const

test("approved staff can use the core operational workspace", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible()
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening),/ })).toBeVisible()

  for (const route of operationalRoutes) {
    await page.goto(route.path)
    await expect(page).toHaveURL(new RegExp(`${route.path.replace("/", "\\/")}$`))
    await expect(page.getByRole("heading", { name: route.heading, exact: true })).toBeVisible()
  }
})

test("core pages have no automatically detectable serious accessibility violations", async ({ page }) => {
  for (const route of operationalRoutes) {
    await page.goto(route.path)
    await expect(page.getByRole("heading", { name: route.heading, exact: true })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(
      results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious"),
      `${route.path} has serious accessibility violations`,
    ).toEqual([])
  }
})

test("notification navigation and theme controls are functional", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: /unread notifications/ }).click()
  await expect(page).toHaveURL(/\/notifications$/)
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible()

  const themeButton = page.getByRole("button", { name: /Switch to (dark|light) mode/ })
  await themeButton.click()
  await expect(page.locator("html")).toHaveClass(/dark/)
})
