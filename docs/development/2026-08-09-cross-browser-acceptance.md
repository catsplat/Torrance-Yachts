# Cross-browser acceptance milestone

**Release:** v0.18.0

The manual browser evidence was converted into a repeatable Playwright suite.
The first run immediately found useful defects: the visible login/setup titles
were not semantic headings, sidebar group labels missed the AA contrast ratio,
all five rehearsal fixtures accidentally shared one provider thread, and one
reset result was repeated for every active rehearsal card.

Those defects were corrected at their source. The email change preserves a
stable thread only for the new-enquiry/follow-up pair; internal, circular, and
unknown fixtures now prove their distinct production routes. A unit assertion
protects that topology.

The final local run passed all 13 scenarios across Chromium, Firefox, and
WebKit. The suite is serial by design because its mutating workflow shares a
single local PostgreSQL source of truth. CI uses a fresh database and generates
its setup values at runtime.
