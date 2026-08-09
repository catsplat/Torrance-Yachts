import { expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

const unapprovedEmail = "unapproved.browser@example.test"
const unapprovedPassword = "Unapproved-Browser!2026"

test.beforeAll(async () => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const previous = existing.data.users.find((user) => user.email === unapprovedEmail)
  const created = previous
    ? await admin.auth.admin.updateUserById(previous.id, {
        email_confirm: true,
        password: unapprovedPassword,
        user_metadata: { display_name: "Unapproved Browser User" },
      })
    : await admin.auth.admin.createUser({
        email: unapprovedEmail,
        email_confirm: true,
        password: unapprovedPassword,
        user_metadata: { display_name: "Unapproved Browser User" },
      })
  if (created.error || !created.data.user) throw new Error("Unapproved browser fixture could not be created.")
  // New identities are inactive and unapproved by default. The test deliberately
  // leaves this reserved account in that state instead of mutating authorization fields.
})

test("operational routes require authentication", async ({ page }) => {
  await page.goto("/bookings")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
})

test("the one-time administrator setup is closed once accounts exist", async ({ page }) => {
  await page.goto("/setup")
  await expect(page.getByRole("heading", { name: "Initial administrator setup" })).toBeVisible()
  await expect(page.getByText("Initial setup is complete. Public registration remains disabled.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Create administrator" })).toHaveCount(0)
})

test("invalid credentials fail without disclosing account state", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Work email").fill("not-approved@example.test")
  await page.getByLabel("Password").fill("invalid-password")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page.getByText("The email address or password was not recognised.", { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test("an unapproved account can authenticate but cannot read the workspace", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Work email").fill(unapprovedEmail)
  await page.getByLabel("Password").fill(unapprovedPassword)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/access-pending$/)
  await page.goto("/bookings")
  await expect(page).toHaveURL(/\/login$/)
})
