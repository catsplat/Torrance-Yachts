# Local development setup

This procedure creates an isolated development environment. It must contain synthetic data only.

## Prerequisites

- Git
- Node.js 24
- npm 11.16.0
- Docker Desktop using Linux containers

## First-time setup

1. Install the locked JavaScript dependencies:

   ```powershell
   npm ci
   ```

2. Create the separate network recommended by Supabase for local-only binding. If Docker reports that it already exists, continue:

   ```powershell
   docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 torrance-yachts-local
   ```

3. Start the local Supabase stack and apply migrations/seeds:

   ```powershell
   npm run db:start
   ```

   Supabase local services use shared development secrets. Never start them on a public or untrusted network.

4. Verify the actual host port mappings; do not assume the custom network was honoured by Docker Desktop:

   ```powershell
   docker ps --filter "label=com.supabase.cli.project=Torrance_Yachts" --format "{{.Names}}|{{.Ports}}"
   ```

   Preferred mappings begin with `127.0.0.1:`. On the verified Windows environment, Docker Desktop reported some mappings as `0.0.0.0:` despite the network option. In that case, keep Windows Firewall enabled, use only a trusted/private network, retain synthetic data, and stop Supabase when it is not in use. Do not proceed with live or sensitive data. This environment is not a production host.

5. Create an ignored environment file:

   ```powershell
   Copy-Item .env.example .env.local
   npm run db:status
   ```

6. Copy only the local API URL and publishable key into `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
   ```

   Do not use or commit the service-role key.

7. Open Supabase Studio at `http://127.0.0.1:54323` only to inspect local
   synthetic data, migrations, and service status. Do not use Studio SQL to
   promote users.

8. For a fresh local environment, set a temporary 32+ character
   `INITIAL_ADMIN_SETUP_TOKEN` in the ignored `.env.local`, restart the web
   application, and complete `http://localhost:3000/setup`. Remove the token
   and restart the application once the first administrator exists. Later users
   are invited by an administrator through Settings.

9. Start the web application:

   ```powershell
   npm run dev
   ```

   To rehearse the production build locally, use `npm run build` followed by
   `npm start`. The standalone launcher binds to loopback by default and copies
   the generated static/public assets into the runtime bundle.

10. Sign in at `http://localhost:3000/login`.

## Local invitation and password recovery

1. An administrator opens **Settings > Users**, enters a synthetic staff name
   and email address, and chooses **Send invitation**.
2. Open the local-only Mailpit inbox at `http://127.0.0.1:54324` and follow
   the **Set up your account** link in a separate browser session.
3. The link reaches `/auth/confirm`, establishes a server-side session, and
   opens **Set a new password**. No session token is placed in the browser URL.
4. Sign in with the new password and enrol the authenticator when prompted.

Password recovery follows the same route. If an email scanner or an expired
link consumes a one-time token, an administrator can send a new recovery email.
For hosted deployment, configure equivalent invite and recovery templates in
the approved Supabase Auth environment and allow the exact
`<APP_BASE_URL>/auth/confirm` URL.

## Optional local Google connection

Google sign-in remains private: an administrator must invite a staff email
before that person can use **Continue with Google**.

1. Create separate web OAuth clients for application sign-in and Workspace
   access. Use these local redirect URIs:
   - sign-in: `http://127.0.0.1:54321/auth/v1/callback`;
   - Workspace: `http://localhost:3000/api/integrations/google/callback`.
2. Copy each value from Google Cloud and store it without printing it:

   ```powershell
   .\ops\configure-google-oauth.ps1 -Field LoginClientId
   .\ops\configure-google-oauth.ps1 -Field LoginClientSecret
   .\ops\configure-google-oauth.ps1 -Field WorkspaceClientId
   .\ops\configure-google-oauth.ps1 -Field WorkspaceClientSecret
   ```

3. Restart Supabase and the web application. The Supabase command wrapper loads
   the ignored `.env.local` automatically.

Staff then use **Continue with Google** to enter the application and separately
choose **Connect Google Workspace** when they want Gmail alerts and controlled
reporting access. No staff member handles an OAuth client secret.

## Daily commands

```powershell
npm run db:start
npm run dev
```

When finished:

```powershell
npm run db:stop
```

## Verification commands

```powershell
npm run check
npm run build
npm run db:test
npm run db:lint
npm audit --audit-level=high
```

## Resetting local data

`npm run db:reset` destroys local database contents, reapplies all migrations, and reloads synthetic seeds. It never targets production unless the command and project configuration are deliberately changed, but always confirm the active environment first.

## Common recovery

- If the API is unavailable, confirm Docker Desktop is running and use `npm run db:start`.
- If authentication unexpectedly fails after a reset, recreate the local user because auth rows are local data.
- If the application reports missing environment variables, check `.env.local` against `npm run db:status` and restart the dev server.
- If port 3000 is already occupied, stop the existing local Next.js process rather than silently changing the documented URL.
- If Studio displays an API communication error, first hard-refresh
  `http://127.0.0.1:54323`. If it persists, run `npm run db:stop`, then
  `npm run db:start`, wait for the core services to become healthy, and reload
  Studio. This preserves local volumes and is the safe recovery after a Docker
  or Windows restart. Do not use `db:reset` merely to recover Studio; reset
  destroys local synthetic data.
