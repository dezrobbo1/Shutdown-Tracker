# Architecture Decision Records

ADR status values: Draft, Accepted, Superseded, Rejected.

## Index

- [ADR-001: Microsoft Project Integration](ADR-001-microsoft-project-integration.md) — **Accepted**
- [ADR-002: Application Architecture](ADR-002-application-architecture.md) — **Draft**
- [ADR-003: Frontend and Mobile](ADR-003-frontend-and-mobile.md) — **Draft**
- [ADR-004: Backend Stack](ADR-004-backend-stack.md) — **Draft**
- [ADR-005: Offline Sync](ADR-005-offline-sync.md) — **Draft**
- [ADR-006: Audit and Approval](ADR-006-audit-and-approval.md) — **Draft**
- [ADR-007: Data Ownership and Schedule Authority](ADR-007-data-ownership-and-schedule-authority.md) — **Accepted**
- [ADR-008: MVP Scope Boundary](ADR-008-mvp-scope-boundary.md) — **Accepted**
- [ADR-009: UX/UI Architecture](ADR-009-ux-ui-architecture.md) — **Accepted**
- [ADR-010: Critical Work Package Reporting](ADR-010-critical-work-package-reporting.md) — **Draft**
- [ADR-011: Project Operational Mapping](ADR-011-project-operational-mapping.md) — **Draft**

## Primary product authority

The following product documents are the primary authority for the approved application and operating model:

- [Product Flow and Software Map](../product/product-flow-and-software-map.md)
- [User Tier and Assignment Model](../product/user-tier-and-assignment-model.md)
- [Task Operational Model](../product/task-operational-model.md)
- [Critical Reporting Model](../product/critical-reporting-model.md)
- [Project Lifecycle and Import / Export](../product/project-lifecycle-and-import-export.md)
- [Implementation Status Map](../product/implementation-status-map.md)

ADRs record architecture decisions that implement or constrain that product authority. The application user types are Tier 1, Tier 2, and Tier 3 only. Historical named-role matrices and area/package/contract/watchlist permission-scope models are not current authority.

## Controlling Project-handoff decisions

ADR-001 defines the Project interchange and complete updated candidate-schedule objective.

ADR-007 defines the three-part authority model:

1. Shutdown Tracker captures field execution facts and authorised Tier 1 inputs and controls which exact inputs may proceed.
2. Microsoft Project calculates the complete updated candidate.
3. Tier 1 controls the candidate decision; the relevant schedule owner or Microsoft Project operator performs any external adoption or merge/import action.

ADR-008 defines the MVP boundary and explicitly allows complete updated candidates, read-only candidate-impact review, and Tier 1-controlled merge/import while continuing to prohibit a Shutdown Tracker scheduling engine or silent master-file update.

The detailed product contract is [Project Candidate Schedule Handoff](../product/project-candidate-schedule-handoff.md).

## Other implementation guidance

- ADR-003 controls application experience/delivery-channel direction.
- ADR-006 controls audit and approval.
- ADR-009 controls the accepted Console and Mobile information architecture.
- ADR-010 controls Critical Work Package reporting.
- ADR-011 controls Project-derived operational classification and mapping boundaries.

Product sources:

- [Product Flow and Software Map](../product/product-flow-and-software-map.md)
- [User Tier and Assignment Model](../product/user-tier-and-assignment-model.md)
- [Task Operational Model](../product/task-operational-model.md)
- [Critical Reporting Model](../product/critical-reporting-model.md)
- [Project Lifecycle and Import / Export](../product/project-lifecycle-and-import-export.md)
- [Implementation Status Map](../product/implementation-status-map.md)
- [Project Candidate Schedule Handoff](../product/project-candidate-schedule-handoff.md)
- [Project Operational Mapping](../product/project-operational-mapping.md)
- [Task Progress Review and Project Input Approval](../product/task-progress-review-export-approval.md)
- [Approval, Candidate Schedule, and Adoption State Model](../product/approval-export-state-model.md)
- [Communications Layer](../product/communications-layer.md)
- [Offline Audit and Sync Rules](../product/offline-audit-sync-rules.md)

## Boundary reminders

- Microsoft Project remains schedule calculation authority.
- Shutdown Tracker may generate a complete updated candidate from approved inputs but does not independently calculate the schedule consequences.
- Project-calculated changes inside a disposable candidate are expected and must be reviewed, not automatically treated as prohibited writes.
- Candidate generation, acceptance, adoption as next schedule, and merge/import into another schedule are separate auditable facts.
- The accepted source/master remains unchanged until Tier 1 records the disposition and the relevant schedule owner or Microsoft Project operator performs the authorised external action.
- Imported Project source values remain immutable.
- Tier 1 has whole-project Console authority. Tier 2 and Tier 3 Mobile authority is bounded by explicit assignments.
- Project-derived classification supports filters, display, saved views, reporting, and bulk Tier 2 assignment aids; it is not application authorisation.
- The Console and Mobile App are separate clients over one shared backend, identity, data, and audit model.
- Generic chat, editable scheduler views, and silent Project write-back require explicit future decisions.
