# ADR 0016: Calm operations design system

**Status:** Accepted

## Context

The application now contains the complete internal workflow. Its earlier
interface was functionally sound, but vertical slices had introduced slightly
different densities for headings, cards, filters, metrics, and loading states.
That made the same operational concepts feel less coherent across Inbox,
Enquiries, Bookings, Tasks, and Settings.

This is a private operational workspace, not a public marketing site. It must
make work queues, decision points, and record registers calm and legible without
decorative effects or copying public-web conventions that add no operational
value.

## Decision

- Use Tailwind's four-point base spacing scale for page gaps, padding, control
  heights, and component rhythm.
- Keep Geist as the single interface typeface, with a fixed heading/body
  hierarchy rather than adding display fonts.
- Use a restrained slate, navy, and teal palette in both light and dark modes;
  teal denotes the primary operational action, not decoration.
- Standardise the shared card, button, input, native-select, navigation, and
  loading-skeleton primitives before changing individual business screens.
- Organise the dashboard around the real daily sequence: Inbox, Enquiry, Offer,
  Booking, Operations, and Follow-up. The action queue remains linked and live;
  it is not a decorative metric wall.
- Retain no generic module placeholders now that each authorised module has a
  concrete implementation. Unknown workspace routes return the normal 404.
- Store the theme preference through a server action and HttpOnly cookie. The
  preference is a presentation setting, but it should not depend on brittle
  client-side mutation to work.

## Consequences

- Improvements to shared primitives apply to all existing workflow pages without
  duplicating styling decisions in each screen.
- Data-heavy Inbox, Documents, Bookings, and Tasks registers display accessible
  skeletons while server data is loading.
- The private application deliberately remains non-indexable and does not add
  public social links or an OG campaign surface; those patterns are not useful
  for an internal client-data system.
- New interface work must reuse the established tokens and avoid arbitrary
  spacing, novelty gradients, unbounded animation, or non-functional controls.
