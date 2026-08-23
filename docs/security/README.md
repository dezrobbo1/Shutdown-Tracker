# Security

## Authentication and authorization

Use OIDC for authentication. Authentication identifies a user; it does not grant project access.

Authorization is project-scoped and follows the exact three-tier and explicit-assignment model in [Authorization Model](authorization-model.md) and [User Tier and Assignment Model](../product/user-tier-and-assignment-model.md):

- Tier 1 has whole-project Master Console authority;
- Tier 2 has Mobile App authority over explicitly assigned tracking tasks and reporting obligations;
- Tier 3 has Mobile App authority over tasks explicitly assigned by the Tier 2 user to whom they directly report, as `WORKING_ON` or `FIELD_CONTROL`.

Membership tier, direct-report relationships, and task/reporting assignments must be explicit and auditable. Discipline, contractor, work group, area, WBS, Project custom fields, Resource `Group`, Critical membership, Operational Categories, filters, and Saved Views never grant application authority.

A workspace-level `can-create-project` entitlement may authorize project creation. It is not a project role or a fourth tier.

The target OIDC and three-tier authorization model is designed but not implemented, as recorded in [Implementation Status Map](../product/implementation-status-map.md).

## Audit events

Audit events capture material changes to project membership, tiers, direct-report relationships, task and Critical-reporting assignments, task execution, problems, actions, evidence metadata, import decisions, offline sync, and security-sensitive settings. Existing export audit rows are retained technical history under [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md); they do not establish a current candidate-approval product contract.

Audit events are append-only and retain actor, project, timestamp, action, target, relevant authorization context, and request metadata. Deactivation, reassignment, correction, and supersession do not erase prior history.

## Evidence access

Evidence files should be stored in object storage. Access is mediated by application authorization and short-lived access mechanisms rather than public object URLs.

Tier 1 has project-level evidence access under project policy. Tier 2 and Tier 3 evidence access follows explicit task assignments. Evidence metadata, original-file download, unlinking, supersession, and audit history may require distinct controls.

## Baseline standards

Use OWASP ASVS and OWASP SAMM as security baselines for planning, implementation, review, and release readiness.
