# Operations design-system polish

**Date:** 17 July 2026

## Outcome

The completed operational workflow now has one deliberate visual language. The
dashboard leads with the actual human work queue, then preserves the supplied
left-to-right charter sequence. Inbox, Settings, and the shared shell use the
same control, card, border, and typography rhythm as the rest of the workspace.

## Changes

- Refined light and dark semantic colour tokens to a restrained navy/teal
  operational palette with accessible contrast.
- Standardised shared buttons, inputs, cards, navigation states, and native
  select controls around the four-point spacing rhythm and one radius family.
- Reduced dashboard visual noise while retaining every queue, count, and route
  as a usable link.
- Replaced text-only loading messages with accessible skeletons for data-heavy
  booking, document, email, and task registers.
- Removed the obsolete generic module placeholder route.
- Replaced the non-working client-only theme toggle with a tested server-action
  preference that persists in an HttpOnly cookie.
- Updated local setup guidance with the supported first-administrator route and
  non-destructive Supabase Studio recovery procedure.
- Made one-way workbook snapshots content-idempotent, so a retry with unchanged
  data cannot create duplicate Google Sheets deliveries.

## Verification

- Visually reviewed the authenticated Dashboard, Inbox, and Settings on the
  local application, plus the dashboard navigation and action queue at a 390px
  mobile viewport.
- Confirmed the dark-mode form action updates the root theme class and persists
  its server-rendered preference.
- Confirmed no browser console errors on the reviewed routes.
- Ran ESLint, TypeScript validation, the 79 application tests, a Next.js
  production build, database linting, all 610 database tests, and the high
  severity dependency audit.
