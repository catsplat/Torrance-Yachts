# Torrance Local AI helper (development)

The future signed macOS helper will replace this small development utility. It
does not expose Ollama to the internet or allow the server to initiate a
connection to the Mac.

1. Install Ollama and at least one local model on the Mac.
2. In **Settings → AI**, create a one-time pairing code.
3. Copy `ops/local-ai-helper.mjs` to the Mac and run:

   ```sh
   node local-ai-helper.mjs --server https://your-private-torrance-address --code YOURCODE --name "Thom's MacBook"
   ```

The helper saves an opaque device token in `~/.torrance-local-ai-token` with
owner-only permissions and reports only the local service/model availability.
Revoke the helper from **Settings → AI** if the Mac is lost, replaced, or no
longer authorised. The current development helper deliberately performs **no AI
analysis jobs**; it is the secure pairing and availability foundation, not a
substitute for the signed macOS release.
