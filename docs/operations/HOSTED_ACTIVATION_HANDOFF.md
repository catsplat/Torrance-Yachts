# Hosted activation handoff

This is the final non-secret preparation boundary. Once the code release is
accepted, the remaining work is provider-owned configuration and staged
acceptance—not another software build.

Do not send a password, private key, API key, token, connection string or client
data in chat, GitHub Issues, commits or screenshots. Store values in the client
secret manager, GitHub Environment secrets, or the VPS-owned `600` deployment
`.env` file only.

## What I need later

A VPS login alone is not enough to make the application live: it does not yet have
the generated Supabase keys, private ingress, account email or the external providers. The smallest
safe handoff is the following client-owned configuration, created directly in the
relevant provider consoles.

| Owner / location | Values or configuration | Why it exists |
| --- | --- | --- |
| VPS | `VPS_HOST`, non-root `VPS_USER`, SSH public-key access and verified `VPS_HOST_KEY` | Runs the private app, lean self-hosted Supabase core, scheduler, ClamAV and Cloudflare Tunnel. |
| GitHub `staging` / `production` environments | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_HOST_KEY`; `DEPLOY_PATH`; public Supabase URL/key variables | Lets the reviewed workflow deploy only the accepted immutable image. Database migrations run from the protected VPS. |
| VPS secret file | Fields in `deploy/self-hosted-cx23/.env.example`, generated non-secret values excluded | Runtime-only credentials for the container stack. |
| Self-hosted Supabase | generated Auth/JWT keys, private Kong URL, SMTP, Auth URLs, Storage and encrypted backup destination | Authoritative database, Auth and private documents. |
| Cloudflare | client-owned domain, Tunnel token and Access policy | HTTPS private ingress with no public VPS application ports. |
| Google | OAuth client ID/secret, exact redirect URIs and approved scopes | Staff sign-in/Workspace connection and controlled Gmail drafts. |
| Telegram | company bot token, username and webhook secret | Internal alerts and secure review links. |
| AI (optional) | OpenAI key and approved model, or leave deterministic provider enabled | AI suggestions only; it never performs consequential work. |

## First VPS preparation

Provision an Ubuntu VPS with a non-root deployment account and SSH key access.
Before any deployment, copy the reviewed bootstrap script to the server and run:

```sh
sudo ./provision-hosted-vps.sh <deployment-user> /opt/torrance-yachts
```

It installs Docker from Docker's signed Ubuntu repository, enables the Docker
service, gives the existing deployment user Docker access, creates the protected
deployment directory and an empty `600` `.env`. It does **not** start an app,
open ports, create provider accounts, add data or write secrets.

At the provider firewall, allow only the approved SSH administration route. Do
not open application, worker, ClamAV, PostgreSQL or Ollama ports. Cloudflare
Tunnel is outbound-only.

## Runtime secret file

On the VPS, copy the tracked template to `/opt/torrance-yachts/.env` and populate
it from client-owned secret storage. Preserve mode `600` and ownership by the
deployment user:

```sh
install -m 600 -o <deployment-user> -g <deployment-user> /dev/null /opt/torrance-yachts/.env
```

`APP_DOMAIN` is the approved private hostname only (for example,
`operations.example.com`): it must not include `https://`, a path or spaces.
The VPS values include `APP_IMAGE`, `DEPLOYMENT_VERSION`,
`CLOUDFLARE_TUNNEL_TOKEN`, the Supabase URL/keys, automation secrets and the
enabled provider values. Do not store deployment values in GitHub repository
variables, source files or chat transcripts.

The expected runtime names are shown here as labels only—never paste values into
this document:

```text
APP_DOMAIN                    APP_ENVIRONMENT
APP_IMAGE                     DEPLOYMENT_VERSION
CLOUDFLARE_TUNNEL_TOKEN       NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY           AUTOMATION_SHARED_SECRET
POSTGRES_PASSWORD             JWT_SECRET
ANON_KEY                      SERVICE_ROLE_KEY
SMTP_HOST
MONITORING_SHARED_SECRET
AUTH_SMTP_CONFIGURED          INITIAL_ADMIN_SETUP_TOKEN
GOOGLE_OAUTH_CLIENT_ID        GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_SIGN_IN_ENABLED        TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME         TELEGRAM_WEBHOOK_SECRET
AI_PROVIDER                   OPENAI_API_KEY
OPENAI_MODEL
```

Use `npm run production:preflight` only against an operator-controlled local copy
of the file. It reports missing names and unsafe configuration but never prints
values. The deployment script will reject unversioned/cross-environment images,
missing secrets, exposed service ports and unhealthy containers.

## Staging first

1. Create a client-owned **staging** hostname and Cloudflare Tunnel.
2. Add its GitHub Environment secrets/variables directly in GitHub.
3. Populate only the staging VPS `.env` with staging values.
4. Build the environment-specific image from the reviewed tag.
5. Deploy staging, then run login/MFA, synthetic email-to-booking, document
   scanning, notification retry, backup restore and macOS browser acceptance.
6. Record the evidence in the application launch screens.
7. Repeat the same process for production from the exact accepted source tag.

The full command sequence, migration safety and rollback rules are in
[Production deployment](PRODUCTION_DEPLOYMENT.md). Provider-specific activation
is in [Email and integration activation](EMAIL_AND_INTEGRATION_ACTIVATION.md).
Every pull request now also compiles, tests and packages the unsigned Windows
test installer on a Windows runner; this protects the desktop companion without
making it part of the hosted deployment path.
