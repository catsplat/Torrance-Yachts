# ADR 0057: paired Mac Ollama execution

## Status

Accepted — 26 August 2026.

## Decision

A staff member’s Mac runs a small Torrance Local AI helper alongside local
Ollama. The helper polls the hosted application over HTTPS using a one-time
pairing-derived bearer token. It claims only short-lived analysis jobs assigned
to its owner, runs the selected Ollama model on loopback, and posts a structured
result back to the application.

The hosted application never opens a port to a Mac, never calls `11434`, and
does not receive an Ollama API credential. A result is schema-validated again
on the server before it can become an AI review record. AI remains advisory.

## Consequences

- Mac users can use their own local model without exposing it to the internet.
- A helper that has not checked in for five minutes cannot receive work.
- The first helper is a transparent Node script. A signed macOS installer is a
  later distribution task because it requires Apple signing/notarisation.
- The recommended starter model is `qwen3:4b-instruct`; staff may select a
  different installed model through their personal AI settings.
