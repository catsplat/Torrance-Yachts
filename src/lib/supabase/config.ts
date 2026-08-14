export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    )
  }

  return { publishableKey, url }
}

/**
 * The browser must use the public HTTPS endpoint. Server-side requests may use
 * the private Kong address in a self-hosted deployment so Cloudflare Access is
 * never asked to proxy the application's own database traffic back to itself.
 */
export function getServerSupabaseConfig() {
  const { publishableKey, url } = getSupabaseConfig()
  return { publishableKey, url: process.env.SUPABASE_INTERNAL_URL?.trim() || url }
}
