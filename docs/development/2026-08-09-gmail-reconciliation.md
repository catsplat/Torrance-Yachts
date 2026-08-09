# User-authorised Gmail reconciliation

Incoming Gmail can now use the same Google Workspace connection a staff member
creates from account settings.

The administrator selects the operational inbox under **Settings → Connections**.
The normal automation tick then initialises a cursor, reads new Gmail history in
bounded batches and sends full messages through the existing idempotent ingestion
boundary. Cursor expiry uses a bounded recent-mail recovery path; failures remain
visible without exposing message bodies or credentials.

The implementation is covered by pure fake-provider tests and 16 new database
assertions for mailbox selection, credential secrecy, cursor durability and
failure visibility. It was not enabled against the connected acceptance account,
so no live mailbox content was imported.

