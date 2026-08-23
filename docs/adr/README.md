# Architecture Decision Records

ADR status values: Draft, Accepted, Superseded, Rejected.

## Index

- [ADR-001: Microsoft Project Integration](ADR-001-microsoft-project-integration.md) — **Superseded**
- [ADR-002: Application Architecture](ADR-002-application-architecture.md) — **Draft**
- [ADR-003: Frontend and Mobile](ADR-003-frontend-and-mobile.md) — **Draft**
- [ADR-004: Backend Stack](ADR-004-backend-stack.md) — **Draft**
- [ADR-005: Offline Sync](ADR-005-offline-sync.md) — **Draft**
- [ADR-006: Audit and Approval](ADR-006-audit-and-approval.md) — **Accepted for audit; export portion superseded**
- [ADR-007: Data Ownership and Schedule Authority](ADR-007-data-ownership-and-schedule-authority.md) — **Superseded**
- [ADR-008: MVP Scope Boundary](ADR-008-mvp-scope-boundary.md) — **Superseded**
- [ADR-009: UX/UI Architecture](ADR-009-ux-ui-architecture.md) — **Accepted**
- [ADR-010: Critical Work Package Reporting](ADR-010-critical-work-package-reporting.md) — **Draft**
- [ADR-011: Project Operational Mapping](ADR-011-project-operational-mapping.md) — **Draft**
- [ADR-012: Product Trial Foundation and Project Export Deferral](ADR-012-product-trial-foundation-and-export-deferral.md) — **Accepted**

## Primary product authority

The following product documents are the primary authority for the approved application and operating model:

- [Product Flow and Software Map](../product/product-flow-and-software-map.md)
- [User Tier and Assignment Model](../product/user-tier-and-assignment-model.md)
- [Task Operational Model](../product/task-operational-model.md)
- [Critical Reporting Model](../product/critical-reporting-model.md)
- [Project Lifecycle and Import / Export](../product/project-lifecycle-and-import-export.md)
- [Implementation Status Map](../product/implementation-status-map.md)

ADRs record architecture decisions that implement or constrain that product authority. The application user types are Tier 1, Tier 2, and Tier 3 only. Historical named-role matrices and area/package/contract/watchlist permission-scope models are not current authority.

## Controlling Project-boundary decision

ADR-012 establishes the active product-trial foundation and defers the final Project export/round-trip design. ADR-001, ADR-007, and ADR-008 remain technical history rather than current delivery authority.

The active boundary retains immutable Project imports, Microsoft Project schedule authority, no independent Tracker scheduling, and no silent master-file write. Exact candidate approval, sealed preview, complete-source generation, and a manual round-trip gate are not active prerequisites.

## Other implementation guidance

- ADR-003 controls application experience/delivery-channel direction.
- ADR-006 controls append-only audit; its export-approval-batch direction is superseded.
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
- [Trial Foundation Retention Map](../product/trial-foundation-retention-map.md)
- [Project Operational Mapping](../product/project-operational-mapping.md)
- [Communications Layer](../product/communications-layer.md)
- [Offline Audit and Sync Rules](../product/offline-audit-sync-rules.md)

## Boundary reminders

- Microsoft Project remains schedule calculation authority.
- The final Project export, candidate, adoption, and merge/import contract is deferred.
- Existing export code is experimental technical infrastructure, not current product authority.
- The accepted source/master must never be silently overwritten by Shutdown Tracker.
- Imported Project source values remain immutable.
- Tier 1 has whole-project Console authority. Tier 2 and Tier 3 Mobile authority is bounded by explicit assignments.
- Project-derived classification supports filters, display, saved views, reporting, and bulk Tier 2 assignment aids; it is not application authorisation.
- The Console and Mobile App are separate clients over one shared backend, identity, data, and audit model.
- Generic chat, editable scheduler views, and silent Project write-back require explicit future decisions.
