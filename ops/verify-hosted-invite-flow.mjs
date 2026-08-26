/*
 * Exercises the production-style invite confirmation boundary without sending
 * mail or retaining a user. Run only inside the application container, where
 * SUPABASE_INTERNAL_URL and SUPABASE_SECRET_KEY are already server-only.
 */
const required = ["APP_BASE_URL", "SUPABASE_INTERNAL_URL", "SUPABASE_SECRET_KEY"]
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required for the invite confirmation probe.`)
}

const baseUrl = new URL(process.env.APP_BASE_URL)
const key = process.env.SUPABASE_SECRET_KEY
const email = `invite-probe-${Date.now()}@example.invalid`
let userId = null

async function request(path, init = {}) {
  return fetch(new URL(path, process.env.SUPABASE_INTERNAL_URL), {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  })
}

try {
  const generated = await request("/auth/v1/admin/generate_link", {
    body: JSON.stringify({
      email,
      options: { redirect_to: new URL("/auth/confirm?next=/account/update-password", baseUrl).toString() },
      type: "invite",
    }),
    method: "POST",
  })
  const generatedBody = await generated.json()
  if (!generated.ok || !generatedBody.id || !generatedBody.hashed_token) {
    throw new Error(`Auth did not generate a usable synthetic invite (${generated.status}).`)
  }
  userId = generatedBody.id

  const confirmationUrl = new URL("/auth/confirm", "http://127.0.0.1:3000")
  confirmationUrl.searchParams.set("next", "/account/update-password")
  confirmationUrl.searchParams.set("token_hash", generatedBody.hashed_token)
  confirmationUrl.searchParams.set("type", "invite")
  const confirmed = await fetch(confirmationUrl, {
    headers: { host: baseUrl.host },
    redirect: "manual",
  })
  const location = confirmed.headers.get("location") ?? ""
  // A probe account intentionally has no approved profile. It must reach the
  // approval boundary, not the invalid-link page.
  if (!location.includes("/access-pending")) {
    throw new Error(`Invite confirmation did not reach the approval boundary (${confirmed.status}).`)
  }
  console.log("Hosted invitation confirmation probe passed.")
} finally {
  if (userId) {
    const deleted = await request(`/auth/v1/admin/users/${userId}`, { method: "DELETE" })
    if (!deleted.ok) throw new Error(`Synthetic invite cleanup failed (${deleted.status}).`)
  }
}
