# Authorization Model

This document applies the primary product authority in [User Tier and Assignment Model](../product/user-tier-and-assignment-model.md) and [Product Flow and Software Map](../product/product-flow-and-software-map.md). Task-level authorization remains within [Task Operational Model](../product/task-operational-model.md); Critical reporting assignments follow [Critical Reporting Model](../product/critical-reporting-model.md); project-state constraints follow [Project Lifecycle and Import / Export](../product/project-lifecycle-and-import-export.md). The current implementation status is recorded in [Implementation Status Map](../product/implementation-status-map.md).

## Direction

Shutdown Tracker uses OIDC for authentication. Application authorization is determined from active project membership, the member's Tier 1, Tier 2, or Tier 3 tier, and explicit task or Critical-reporting assignments where the tier requires them.

Job titles and Microsoft Project classifications are not application roles. Shutdown Tracker has exactly three project user tiers.

## OIDC authentication

- Use an OIDC provider for sign-in.
- Store only the application identity and provider subject required to map a user to workspace entitlements and project membership.
- Do not commit secrets, client secrets, `.env` files, keys, tokens, or provider configuration containing credentials.
- Authentication proves identity; it does not grant project access by itself.

## Project membership and lifecycle

- Membership is project-scoped and records exactly one effective tier at a time.
- A person may have a different tier or no membership in another project.
- Membership activation, deactivation, and tier changes must be historically reconstructable and audited.
- Deactivation removes current access without deleting earlier assignments, reports, execution events, approvals, comments, or audit identity.
- Draft, Active, Closed, and Archived project state further constrains available operations as defined in [Project Lifecycle and Import / Export](../product/project-lifecycle-and-import-export.md).

A workspace-level `can-create-project` entitlement may authorize project creation before a project membership exists. It is not a project role and is not a fourth user tier.

## Tier authority

### Tier 1

Tier 1 uses the Master Console and has whole-project visibility and operational update authority. Tier 1 may act on any task, manage task-owned operational records, configure Critical reporting, assign tracking responsibility to Tier 2, and manage project membership, settings, imports, exports, and lifecycle.

Tier 1 authority is not narrowed by a category, filter, saved view, discipline, contractor, WBS branch, Resource `Group`, or Critical membership. It remains subject to project lifecycle, append-only audit, evidence controls, and the Project boundary in [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md). The deferred export contract does not reduce Tier 1 operational authority or create an implied export permission model.

### Tier 2

Tier 2 uses the Mobile App and may access only:

- tasks explicitly assigned by Tier 1 for Tier 2 tracking responsibility;
- task-owned operational records available through those assignments; and
- Critical reporting obligations explicitly assigned by Tier 1.

Tier 2 may update an assigned task and may assign field work on that task to an active direct-report Tier 3 user. Tier 2 retains tracking responsibility after assigning field work onward and may not browse the whole project.

### Tier 3

Tier 3 uses the Mobile App and may access only tasks explicitly assigned by the Tier 2 user to whom they directly report. Each assignment records either `WORKING_ON` or `FIELD_CONTROL`.

Tier 3 may update an assigned task under the task's policy. Tier 3 may not assign work onward, configure Critical reporting, own a formal Critical reporting obligation, or browse the whole project.

## Direct-report and assignment checks

A Tier 2 user may assign a task only to an active Tier 3 user with an explicit, current direct-report relationship to that Tier 2 user in the same project. The relationship must be effective-dated or otherwise historically reconstructable.

Task authority comes from saved assignment records:

- Tier 1 creates or ends Tier 2 tracking assignments;
- the assigned Tier 2 creates or ends `WORKING_ON` or `FIELD_CONTROL` assignments for direct-report Tier 3 users;
- assignment, reassignment, correction, reversal, and end events preserve actor, time, reason where required, and prior state;
- ending a membership or direct-report relationship prevents new use without erasing assignment history.

## Authorization evaluation

Evaluate a request in this order:

1. authenticate the identity;
2. confirm project identity, lifecycle state, and active project membership;
3. confirm the effective Tier 1, Tier 2, or Tier 3 tier;
4. for Tier 2 or Tier 3, confirm the required explicit task or Critical-reporting assignment;
5. for Tier 2-to-Tier 3 assignment, confirm the active direct-report relationship;
6. enforce the requested operation's record-state, audit, evidence, and applicable Project import/export boundary rules.

Tier 1 does not require a task assignment to exercise whole-project authority.

## Values that never grant authority

Do not infer visibility or update authority from:

- discipline;
- contractor;
- work group;
- area;
- WBS or summary ancestry;
- Microsoft Project custom fields;
- Resource `Group`;
- Project-critical or Critical membership;
- Operational Categories;
- filters or Saved Views.

These values may support filtering, grouping, display context, Critical selection, reporting, and a Tier 1 bulk-assignment selection. A bulk operation must still save explicit Tier 2 assignments; it must not create a dynamic category-derived permission scope.

## Evidence access

- Tier 1 may access project evidence under project policy.
- Tier 2 and Tier 3 evidence access follows the explicit task assignment and task-owned record boundary.
- Original-file download may be controlled separately from evidence metadata access.
- Use application authorization and short-lived access mechanisms rather than public object URLs.
- Evidence linking, unlinking, supersession, and any permitted deletion must be audited.
- Ordinary deletion must not erase required evidence or audit history.

## Audit and security-history access

- Tier 1 may access project audit and security history required for project control.
- Tier 2 and Tier 3 may see relevant task history exposed through an assigned Task Detail; this is not project-wide audit-log access.
- Membership, tier, direct-report, task-assignment, Critical-reporting-assignment, project-creation-entitlement, and sensitive evidence-access changes must be audited.
- Security events and historical authorization context remain protected from unauthorized disclosure.

## Future tenant boundary

The baseline is project-scoped. If multi-tenant operation is introduced, tenant boundaries must be explicit, audited, and covered by an ADR update before implementation.
