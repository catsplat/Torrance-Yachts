# Phase 8 verification record

**Status:** Release-candidate verification passed

## Automated evidence

- Nine application test files / 46 unit tests passed.
- Seven PostgreSQL suites / 287 security and behaviour assertions passed.
- Production Next.js build passed with the new document routes.
- Database lint reported no warnings.
- Dependency audit reported zero vulnerabilities.
- Linux lockfile dry-run and repository credential scan passed.

## End-to-end synthetic walkthrough

Using the local administrator, the acceptance walkthrough:

1. approved the offer and task templates;
2. progressed the synthetic enquiry through offer and signatures;
3. confirmed a booking and generated its tasks and six document requirements;
4. uploaded a synthetic PDF through the real private Storage policy;
5. registered and human-verified the charter agreement;
6. saved and explicitly approved reviewed contract fields;
7. generated two instalments totalling the charter fee;
8. calculated the 2% commission as EUR 3,360 deterministically;
9. updated booking, reservation, and task dates;
10. created a five-minute signed private link.

Authenticated server rendering returned HTTP 200 for the dashboard, document
register, booking, protected document/payment workspace, and booking checklist.
Unauthenticated document access redirected to `/login`.

No real identity document, contract, bank detail, contact, or commercial term was
used.
