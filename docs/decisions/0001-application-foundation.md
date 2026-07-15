# ADR 0001: Application foundation

**Status:** Accepted

**Date:** 15 July 2026

## Context

The project is a small-user internal operations system with a broad, security-sensitive workflow. The developer is strongest in Python and wants to minimise custom code while producing a maintainable portfolio-quality system. The product must eventually support server-rendered business data, responsive use on macOS, background automation, and protected documents.

## Decision

Use a single Next.js App Router application at the repository root with:

- TypeScript in strict mode;
- React Server Components by default;
- narrowly scoped client components for browser interaction;
- Tailwind CSS and shadcn/ui source components;
- npm and a committed lockfile;
- ESLint, TypeScript, production-build, and dependency-audit gates;
- a route group for the shared internal workspace shell;
- configuration-driven primary navigation;
- synthetic fixtures until the database and permissions are implemented.

PostgreSQL/Supabase, n8n, and external integrations are deliberately deferred rather than mocked as working services.

## Rationale

- Official scaffolding removes avoidable setup code.
- Server-first rendering aligns with future secret-bearing database access.
- shadcn/ui provides inspectable application-owned component source instead of an opaque theme dependency.
- One application is simpler for a solo first-time project than an early monorepo or separate API service.
- A shared shell reflects the original sketch and prevents every module from inventing its own navigation/layout.
- Synthetic data makes the UI testable without creating a privacy risk.

## Consequences

### Positive

- The project runs locally and builds for production without any paid service.
- Future modules have stable layout, routing, design, and documentation conventions.
- The codebase has a small client-side surface and no premature integration logic.
- The milestone is demonstrable in a portfolio without exposing business data.

### Negative

- Version `0.1.0` looks operational but is intentionally non-functional.
- Dynamic business behaviour cannot be accepted until the database and application layer exist.
- Current shadcn/Base UI conventions must be followed rather than older tutorial patterns.

## Revisit when

- a separate worker/API service becomes necessary for reliability;
- deployment constraints make Next.js hosting unsuitable;
- measured complexity justifies a monorepo;
- the authentication or background-processing design requires a different boundary.
