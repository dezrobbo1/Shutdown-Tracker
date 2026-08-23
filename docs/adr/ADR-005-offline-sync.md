# ADR-005: Offline Sync

Status: Draft

## Context

Tier 2 and Tier 3 use the Mobile App for explicitly assigned work and need those workflows to tolerate unreliable connectivity. Offline capability must preserve assignment authority, event provenance, ordering, corrections, and audit evidence rather than create a second local source of truth.

## Decision

Design Mobile App offline workflows around IndexedDB, service workers, Cache API, idempotency keys, visible sync state, and explicit conflict/error handling. Treat Background Sync as progressive enhancement only.

Queued commands remain bound to the project, task, actor, Tier 2/Tier 3 assignment, client-created identity, and recorded client time. The server revalidates current membership, assignment authority, command eligibility, and conflict state when replay occurs. Offline capture does not authorize whole-project browsing or allow a user to bypass an ended assignment.

Sync is a visible transport and recovery state attached to Assigned Tasks and Task Detail. It is not a separate top-level Mobile destination.

## Consequences

- Correctness must not depend on Background Sync availability.
- Queued, sending, server-received, failed, and conflict states must be visible to Tier 2 and Tier 3 where relevant.
- API operations that may be queued need idempotency and replay-safe behavior.
- Local optimistic state must remain distinguishable from server-accepted state.
- Revoked or conflicting queued operations fail visibly and retain enough local provenance for recovery; they are not silently applied or discarded.
- Offline replay preserves the same explicit-assignment, immutable-history, correction, and supersession rules as online submission.
