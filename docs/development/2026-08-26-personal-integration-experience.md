# 26 August 2026 — Personal integration experience

## Delivered

- Completed the paired Mac local-AI path beyond status reporting. It now uses
  a durable, leased outbound job queue and server-side validation.
- Reworked the Mac helper’s first-use path so it can pair, check Ollama and
  download the recommended model in one setup command after Ollama itself has
  been installed.
- Made personal mailbox setup clearer with IMAP provider presets and support
  for email notifications through either Google or IMAP.

## Boundary retained

No browser application can silently install third-party macOS software, create
a Telegram bot, or create a mail-provider app password. The interface removes
developer credentials from normal staff setup, but those one-time provider and
operating-system approval steps remain deliberately explicit.
