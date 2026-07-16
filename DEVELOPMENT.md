# Development Setup & Configuration Guide

## Email Systems: Two Separate Flows

This app has **two completely independent email systems**. Understanding the difference is critical.

---

## 1. Auth Email Testing (InbucketSMTP)

### What It Does

When you **invite a user** or **request a password recovery**, Supabase Auth sends an email. Locally, this is captured by **InbucketSMTP** instead of being sent externally.

### How to Test Invitations Locally

1. **Start Supabase:**
   ```bash
   npm run db:start
   npm run dev
   ```

2. **Sign in as administrator** at http://localhost:3000

3. **Navigate to Settings → Internal Users → "Invite staff member"**

4. **Enter an email and click "Send invitation"**
   - You'll see: "Invitation email requested. Confirm delivery before granting operational work."

5. **View the captured email:**
   - Open: http://localhost:54324 (InbucketSMTP web UI)
   - Find your invitation email in the inbox
   - Copy the auth callback link (contains the signup token)

6. **Complete the invitation flow:**
   - Open the link in a new incognito window
   - Set a password (12+ chars, uppercase, lowercase, number, symbol)
   - New user account is created

### What's Being Captured

- User invitations (`auth.admin.inviteUserByEmail()`)
- Password recovery emails (`auth.resetPasswordForEmail()`)
- Any other Auth emails configured in Supabase

### Why It's Safe

- InbucketSMTP is built into Supabase Local Development
- Emails never leave your machine
- No external APIs or credentials needed
- Development-only; production uses real SMTP

### Local Configuration

In `supabase/config.toml` (lines 103-113):

```toml
[local_smtp]
enabled = true
port = 54324
```

This enables the testing server. No other configuration needed for development.

---

## 2. Gmail Inbox Email Ingestion (n8n + Gmail API)

### What It Does

**Real emails from Gmail** are imported into the app's inbox via:
1. Gmail API watch/push notifications (Google pushes new email notifications to you)
2. n8n workflow fetches the full email details
3. n8n calls your app's `/api/integrations/gmail/messages` endpoint
4. App stores it in PostgreSQL and displays in the inbox UI

### Architecture

```
Real Gmail Account
  ↓
Gmail API (watch/push) + OAuth
  ↓
n8n (local automation engine at 127.0.0.1:5678)
  ↓
POST /api/integrations/gmail/messages (with Bearer token)
  ↓
PostgreSQL email_messages table
  ↓
Inbox UI (http://localhost:3000/emails)
```

### Why It's Not Working Yet

- **You haven't connected your Gmail account** in Settings → Alerts
- **n8n is running but workflows are inactive by design** (development simulator is disabled)
- **Gmail API watch is not configured** (requires Google Cloud credentials)

### How to Enable It (Production Setup)

1. **Get Gmail OAuth credentials:**
   - Create a Google Cloud project
   - Enable Gmail API
   - Create OAuth 2.0 credentials (Web application type)
   - Set redirect URI to your app's auth callback

2. **Connect your Gmail account:**
   - Go to Settings → My alerts and connections
   - Click "Connect Gmail account"
   - Authorize your Gmail account
   - Credentials are encrypted in Supabase Vault

3. **Configure n8n workflow:**
   - Start n8n: `npm run automation:start`
   - Open http://127.0.0.1:5678
   - Create a workflow that:
     - Watches Gmail inbox via "Gmail" node
     - Calls your app's `/api/integrations/gmail/messages` endpoint
     - Includes Bearer token from `EMAIL_INGESTION_TOKEN` env var

4. **Activate the workflow** in n8n

### Bearer Token Security

The endpoint validates:
```typescript
// src/app/api/integrations/gmail/messages/route.ts
function validBearerToken(request: Request) {
  const configured = process.env.EMAIL_INGESTION_TOKEN
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(expectedBuffer, suppliedBuffer)
}
```

Set `EMAIL_INGESTION_TOKEN` in `.env.local` to a long random string. n8n workflows must include this token in every request.

### Production vs. Development

| Aspect | Development | Production |
|--------|-------------|-----------|
| **Gmail API** | Configured but not connected | Real Gmail account + OAuth |
| **n8n workflows** | Disabled by design | Active and scheduled |
| **Email watch** | Not running | Actively watching Gmail |
| **Testing** | Manual POST requests only | Real emails flowing in |

---

## 3. AI Provider Configuration

### Current State

The app defaults to **deterministic-v1** (local, no API needed, free, repeatable for testing).

### How It Works

```typescript
// src/lib/ai/config.ts
export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "local"
  if (provider === "local") return new LocalAiProvider()
  if (provider === "openai") return new OpenAiProvider()
}
```

### deterministic-v1 (Local, Default)

**What it is:**
- Pure TypeScript logic that generates predictable output
- No external API calls, no costs, no network dependency
- Uses regex and simple parsing to extract:
  - Dates (e.g., "14 August 2026")
  - Guest counts (e.g., "10 guests")
  - Amounts (e.g., "EUR 180,000")
  - Yacht names (matches against active yachts in database)
  - Routes (e.g., "Athens to Athens")

**Why use it:**
- ✅ Free
- ✅ Instant (no API latency)
- ✅ Repeatable (same input = same output)
- ✅ Perfect for testing the entire workflow
- ✅ No API key management

**Why not use it:**
- ❌ Very simple regex-based extraction
- ❌ Can't understand complex email structures
- ❌ No natural language understanding

### Switch to OpenAI

**Prerequisites:**
- OpenAI API key (get from https://platform.openai.com/api-keys)
- Budget allocated (GPT-4o ~$0.015 per email analysis)

**Configuration:**

1. **Add to `.env.local`:**
   ```env
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-proj-xxxxx...your-key-here...xxxxx
   OPENAI_MODEL=gpt-4o
   ```

   Optional models:
   - `gpt-4o` (recommended, fast, smart)
   - `gpt-4-turbo` (powerful, slower)
   - `gpt-4` (slower, more expensive)

2. **Restart the app:**
   ```bash
   npm run dev
   ```

3. **Test it:**
   - Go to `/emails`
   - Pick an email
   - Click "Generate AI suggestion"
   - It now calls OpenAI instead of local logic

### Safety Boundaries (Both Providers)

Regardless of which provider you use:
- ✅ AI output is **advisory only**
- ✅ Humans must **review before approving**
- ✅ Approvals are **separate from application** (can reject or modify)
- ✅ Evidence is **verified** (quoted excerpts must exist in source)
- ✅ Confidence scores are **shown** (e.g., "82% confidence")
- ❌ AI **cannot** send emails, create bookings, or update Yachtfolio
- ❌ AI **cannot** make any consequential database changes

### AI Settings Page

At http://localhost:3000/settings, you'll see:

```
AI provider: local · deterministic-v1 · configured
```

or (after switching):

```
AI provider: openai · gpt-4o · configured
```

---

## Complete Setup Checklist

### For Local Development

- [ ] `npm ci` — install dependencies
- [ ] `docker network create ...` — create Docker network (one-time)
- [ ] `npm run db:start` — start Supabase
- [ ] Copy `.env.example` to `.env.local`
- [ ] `npm run dev` — start web app
- [ ] Create administrator user in Supabase Studio (http://127.0.0.1:54323)
- [ ] Test invitation flow via Settings → Internal Users
- [ ] View captured invitation emails at http://localhost:54324

### To Add OpenAI

- [ ] Get API key from OpenAI
- [ ] Add `AI_PROVIDER=openai` and `OPENAI_API_KEY=...` to `.env.local`
- [ ] Restart app
- [ ] Test by generating AI suggestions on emails

### To Enable Real Gmail Ingestion (Production Setup)

- [ ] Create Google Cloud project
- [ ] Enable Gmail API
- [ ] Create OAuth 2.0 credentials
- [ ] Configure `EMAIL_INGESTION_TOKEN` in `.env.local` (random string)
- [ ] Connect Gmail account in Settings → Alerts
- [ ] Start n8n: `npm run automation:start`
- [ ] Create n8n workflow to watch Gmail and POST to `/api/integrations/gmail/messages`
- [ ] Activate workflow

---

## Port Reference

| Port | Service | URL | Purpose |
|------|---------|-----|---------|
| 3000 | Next.js App | http://localhost:3000 | Main application |
| 5678 | n8n | http://127.0.0.1:5678 | Automation workflows (local only) |
| 54321 | Supabase API | http://127.0.0.1:54321 | Database API |
| 54322 | PostgreSQL | 127.0.0.1:54322 | Direct database connection |
| 54323 | Supabase Studio | http://127.0.0.1:54323 | Database UI & admin |
| 54324 | InbucketSMTP | http://localhost:54324 | Email testing UI |
| 54327 | Analytics | http://127.0.0.1:54327 | Analytics dashboard |

All ports except 3000 and 5678 bind to `127.0.0.1` only (not accessible from other machines).

---

## Troubleshooting

### Invitations Not Being Sent

1. **Check `.env.local`:**
   - Ensure `APP_BASE_URL=http://localhost:3000` is set
   - This URL is used in invitation links

2. **Check InbucketSMTP:**
   - Open http://localhost:54324
   - Look for an email with a red error banner
   - Error message will show what went wrong

3. **Check Supabase logs:**
   - Run `supabase logs` in another terminal
   - Look for Auth-related errors

4. **Verify InbucketSMTP is enabled:**
   ```bash
   grep -A 3 "\[local_smtp\]" supabase/config.toml
   # Should show:
   # [local_smtp]
   # enabled = true
   # port = 54324
   ```

### AI Suggestions Not Working

1. **Verify configuration:**
   - Go to Settings → (scroll down to AI provider)
   - Check if it says "configured" or "not configured"

2. **If using OpenAI:**
   - Verify `OPENAI_API_KEY` is set: `echo $OPENAI_API_KEY`
   - Verify key is valid at https://platform.openai.com/api-keys
   - Check API usage at https://platform.openai.com/account/usage/overview
   - Restart app after adding key: `npm run dev`

3. **Check browser console:**
   - Open DevTools (F12) → Console tab
   - Look for error messages when clicking "Generate AI suggestion"

4. **Check server logs:**
   - Watch the `npm run dev` terminal
   - Look for errors from `/ai` endpoints

### n8n Not Connecting to App

1. **Verify Bearer token:**
   - In n8n, workflow should include: `Authorization: Bearer $EMAIL_INGESTION_TOKEN`
   - In `.env.local`, verify `EMAIL_INGESTION_TOKEN` is set to same value

2. **Verify n8n can reach app:**
   - From n8n container: `curl http://host.docker.internal:3000`
   - (Docker uses `host.docker.internal` to access host machine)

3. **Check n8n logs:**
   - Run `docker logs torrance-yachts-automation_n8n_1 -f`
   - Look for connection errors

---

## Recent Changes

### SMTP Email Testing Enabled (2026-07-16)

**What changed:**
- Uncommented `[local_smtp]` section in `supabase/config.toml`
- InbucketSMTP testing server is now active on port 54324

**Why it matters:**
- Invitations can now be tested locally without external email service
- Recovery emails work without SMTP provider configured
- Captured emails viewable in web UI for inspection

**What it enables:**
- Test "Send invitation" flow end-to-end
- Verify email content and links before production
- No configuration needed beyond uncommenting

**Status:**
- Safe to use for development
- Does not interfere with Gmail inbox ingestion (separate system)
- Does not send real emails or require credentials
