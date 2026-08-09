# Directory, document and notification registers

## Outcome

Contacts, Companies, Documents and personal Notifications now use stable
PostgreSQL cursor pagination instead of fixed client-visible fetch windows.

## User-facing changes

- Directory searches operate over every authorised record and show exact
  totals.
- Document search can be narrowed by document type, malware-scan state and
  review state.
- Notifications have clear All, Unread and Read views with exact counts.
- Routine page copy was shortened while the controls retained accessible
  labels.

## Assurance

The database suite proves cursor continuity, exact filtered counts,
user-specific notification isolation and anonymous denial. Document register
queries continue to execute within the existing private-document RLS boundary.
