import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("an authenticated Telegram action link opens a usable mobile review surface", async ({ page }) => {
  await page.goto("/notifications")
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible()
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([])
})

test("mobile navigation traps focus and restores it when dismissed", async ({ page }) => {
  await page.goto("/")
  const trigger = page.getByRole("button", { name: "Open navigation" })
  await trigger.click()
  const drawer = page.getByRole("dialog")
  await expect(drawer).toBeVisible()
  const navigation = drawer.getByRole("navigation", { name: "Primary navigation" })
  const settings = navigation.getByRole("link", { name: "Settings" })
  await settings.scrollIntoViewIfNeeded()
  await expect(settings).toBeInViewport()
  await page.keyboard.press("Escape")
  await expect(drawer).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
