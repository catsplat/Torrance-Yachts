# Torrance Local AI helper

Torrance Local AI lets an individual staff member run approved, review-only AI
analysis on their own Mac. Ollama remains on `127.0.0.1`; the hosted workspace
never opens a port to the Mac or receives an Ollama credential.

## One-time Mac setup

1. Install and open [Ollama for macOS](https://ollama.com/download). Install
   Node.js 22 or newer if it is not already present.
2. In **Settings → AI**, select **Set up this Mac**.
3. Copy the generated command, paste it into Terminal on that Mac and wait for
   it to finish. It downloads the selected model, stores the helper in the
   signed-in user's Application Support directory and registers a per-user
   `launchd` agent.
4. Select the paired local provider in the same AI settings screen.

The command only works once and expires after ten minutes. It stores an opaque
device token in `~/.torrance-local-ai-token` and uses owner-only file
permissions. It may be revoked from **Settings → AI** if the Mac is lost,
replaced or no longer authorised.

## What the helper can do

The helper polls outbound over HTTPS, claims only short-lived AI jobs belonging
to its paired staff account, runs the selected model locally and returns a
schema-validated proposal. It can classify and summarise messages, extract
supported details and draft text for review. It cannot create bookings, reserve
yachts, send communications or change operational state.

The interim helper is a reviewed script. A signed/notarised macOS application
remains the appropriate distribution path before it is installed across client
devices.
