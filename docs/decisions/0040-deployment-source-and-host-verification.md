# ADR 0040: Deployment source and host verification

**Status:** Accepted
**Date:** 14 August 2026

## Context

Environment-prefixed GHCR tags prevent an obvious staging/production mix-up, but
a tag alone is not sufficient deployment evidence. It must also be tied to the
reviewed source commit, and an apparently healthy application container is not
enough evidence that the private host package obeys its operational boundary.

## Decision

- The deployment workflow resolves the checked-out release tag to its exact
  40-character Git revision.
- `deploy-release.sh` rejects an image unless its OCI source-revision label,
  environment label and release-tag label all match the requested deployment.
- The VPS stores the deployed digest and reviewed source revision separately as
  non-secret operational evidence.
- After every deployment, a target-side verifier confirms the `.env` mode,
  immutable digest deployment, expected running services, no host ports for the
  application/worker/ClamAV and private Supabase services, matching OCI labels,
  applied reviewed migrations and internal health endpoints.
- The verifier prints only safe deployment evidence; it never reads or outputs
  secret values from `.env`.
- Every third-party GitHub Action used by the CI, image-build and deployment
  workflows is pinned to a full commit SHA. The release-package validator rejects
  a moving action tag or branch reference.
- The ClamAV and Cloudflare Tunnel images in the CX23 runtime Compose file are
  pinned to reviewed multi-architecture registry digests. Local n8n is not part
  of the hosted runtime.

## Consequences

- A mistaken re-tagged image from a different source revision is rejected before
  it can replace the running stack.
- A deployment is not reported successful merely because Docker started: the
  private-network, file-permission and service-health boundary is also checked.
- This is defence against accidental or unauthorised release drift, not a claim
  of cryptographic supply-chain attestation. GitHub artifact attestations for
  this private repository remain a future hosting-account decision because their
  availability depends on the GitHub plan.
