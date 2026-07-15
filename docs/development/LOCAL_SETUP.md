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

7. Open Supabase Studio at `http://127.0.0.1:54323`. Under Authentication, create a synthetic local user with a unique password of at least 12 characters.

8. Bootstrap the first local administrator through Studio's SQL editor, substituting the synthetic email just created:

   ```sql
   update public.profiles
   set role = 'administrator'
   where email = 'your-local-user@example.test';
   ```

   This is an explicit bootstrap operation. Later users remain staff unless an administrator changes them through an approved management path.

9. Start the web application:

   ```powershell
   npm run dev
   ```

10. Sign in at `http://localhost:3000/login`.

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
