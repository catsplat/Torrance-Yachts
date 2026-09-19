# Telegram receiving on private deployments

Use outbound getUpdates polling on the private Tailscale host. Do not publish
the application or weaken its access boundary to accommodate Telegram callbacks.
The application retains bot credentials; the scheduler only calls an authenticated
internal endpoint. PostgreSQL retains the update offset and a fenced 45-second
lease. Process at most 25 updates per request and acknowledge only processed ones.
Pairing accepts private chats only. Tokens are hashed before the existing pairing
RPC; message bodies are not stored by the receiver.

Hosted Compose defaults TELEGRAM_RECEIVE_MODE to polling. Supply the company bot
token and username through server secrets. No webhook secret is needed in polling
mode. An existing webhook must first be removed without dropping pending updates;
the receiver reports conflicts rather than silently changing Telegram setup.
Do not run another polling consumer for this bot. Switching to webhook mode remains
possible on an appropriately protected public deployment.

Reference: https://core.telegram.org/bots/api#getupdates
