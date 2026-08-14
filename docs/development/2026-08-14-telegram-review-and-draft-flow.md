# Telegram review and Gmail-draft flow

## Purpose

Complete the first operational alert path from an AI-assisted new enquiry to a
staff-controlled Gmail draft, without making Telegram, AI, or automation an
authority for consequential communication.

## Implemented behaviour

1. A stored, non-circular email is materialised as a per-user alert according to
   that staff member's enabled topics and paired Telegram destination.
2. The alert adapter sends a concise Telegram message and a URL button to the
   authenticated workspace review page. Text is capped at Telegram's provider
   limit; the review route remains available even when the AI draft is long.
3. Staff inspect evidence, correct or approve the AI result, and route a new
   enquiry. Routing creates or reuses the sender contact through existing,
   audited database logic.
4. The staff member selects **Create Gmail draft**. The server derives the
   recipient and content from the approved suggestion and stored email; it does
   not accept a client-provided recipient or message body.
5. The central notification/outbox function queues a `gmail_create_draft`
   delivery using the approving staff member's encrypted per-user Google OAuth
   connection. The Gmail adapter calls the drafts endpoint, never the send
   endpoint.

## Boundaries

- Telegram pairing is one-time, expiring and webhook-secret verified.
- Telegram is internal staff-only and cannot target a broker or captain.
- Gmail draft creation requires an active approved staff account, an approved AI
  suggestion, a human-routed new enquiry and its stored sender contact.
- The system retains notification and delivery evidence. Retrying the action
  uses a suggestion-scoped idempotency key.
- Production activation still requires a company-owned bot, HTTPS webhook,
  paired staff account and a connected Gmail account. No token was introduced
  into local configuration or source control.

## Verification

- focused lint: pass;
- strict TypeScript check: pass;
- Telegram provider contract tests: 6 pass.
