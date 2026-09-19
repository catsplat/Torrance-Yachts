# Telegram private-host receiver

Implemented outbound pairing receipt, bounded processing, durable progress,
exclusive leases and failure-safe retry. Webhook and polling use one private-chat
pairing handler. The scheduler continues other adapters after individual failures
but reports an unsuccessful cycle rather than a healthy heartbeat.

Local verification: six database assertions and nine focused unit tests. No real
Telegram credentials or recipients were used. Migration 20260919110000 and the
application/worker changes must be deployed together. Live bot acceptance remains
pending company bot configuration; no public ingress is required.
