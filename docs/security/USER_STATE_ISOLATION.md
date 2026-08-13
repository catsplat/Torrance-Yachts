# User State Isolation

## Rule

Personal state is always attached to the authenticated Supabase user UUID. A browser, email address supplied by a form, display name, or client-provided user identifier is never an authority for personal state.

## Persistence map

| State | Persistence | Ownership boundary |
| --- | --- | --- |
| Interface theme | `user_ui_preferences` | `user_id` primary key, RLS and `update_my_ui_theme()` |
| Alert channels, topics and notification email | `user_notification_preferences` | `user_id` primary key, RLS and `update_my_alert_preferences()` |
| Personal phone and Telegram chat destination | `profiles` | authenticated owner through approved preference/pairing commands |
| Gmail connection status and account email | `user_oauth_connections` | composite `(user_id, provider)` primary key, Vault-backed command and RLS |
| Gmail OAuth secrets | Supabase Vault | secret IDs owned by the matching `user_oauth_connections` row; never returned to a browser |
| Telegram pairing request | `telegram_pairing_requests` | `user_id`, opaque one-time token and trusted webhook completion |
| Notification receipt/read state | `notifications` | `recipient_user_id` or creator; personal receipts are not visible cross-user |
| AI provider, model, enabled state and summary style | `user_ai_preferences` | `user_id` primary key, RLS and `update_my_ai_preferences()` |
| Personal OpenAI credential | Supabase Vault | secret ID owned by the matching `user_ai_preferences` row; only the service role can resolve it for that user |
| Tutorial progress/history | `tutorial_sessions`, `tutorial_history` | `user_id` and RLS |
| Auth session and MFA assurance | Supabase Auth cookies and verified claims | Supabase session subject; MFA remains required for workspace/server actions |

Operational configuration is deliberately not personal state: yacht data, task templates, workflow rules, integration destinations, invoice profiles, and launch checks are shared business records. They remain governed by role checks, RLS and audit history.

## Browser behavior

The application intentionally stores no personal values in `localStorage`, `sessionStorage` or IndexedDB. Supabase browser authentication uses secure cookies; theme is now fetched server-side for the authenticated profile. The legacy `ty-theme` cookie and pending Google-connection cookie are cleared on logout, and all dynamic application responses use `Cache-Control: private, no-store, max-age=0` to prevent a shared browser restoring an earlier user’s workspace from its history cache.

Google connection consent uses a short-lived, HTTP-only pending cookie. Its signed state includes the initiating user UUID and the callback verifies it against the currently authenticated user before credentials can be saved. Signing out clears it; a different user cannot complete the prior user’s connection.

## Profile privacy

Raw `profiles` rows include private contact-routing values. Ordinary staff can read only their own row. Shared operational forms use `list_active_staff_directory()` or `list_active_notification_recipient_directory()`, which return only the minimum safe directory information. Administrators access account-management records through the explicit role-checked `list_internal_user_administration_records()` function.

## Verification

`supabase/tests/database/039_user_personal_state_isolation.test.sql` uses two synthetic staff users with deliberately different theme, alert, Gmail, notification and tutorial state. It proves that each user can restore their own state while RLS hides the other user's private state. `supabase/tests/database/040_user_ai_preferences.test.sql` applies the same two-user isolation proof to AI preferences and Vault-backed personal credentials.
