# Product

## Product modules

- Project import and immutable snapshots
- Imported WBS, tasks, resources, assignments, calendars, and custom-field metadata
- Project Operational Mapping and Source Catalogue
- Versioned Import Profiles and Operational Categories
- Query-only Operational Scope and Saved Views
- Task execution and structured progress
- Task-owned Delays / Problems and Actions
- Task-owned Evidence, Discussion, and History
- Critical items, Critical Work Packs, reporting policies, and immutable reports
- Immutable import review, correction, supersession, and audit
- Entity-linked Discussion / Communications Layer
- Tier 1/Tier 2/Tier 3 project membership, direct reports, and explicit assignments
- Offline sync queue

## Application experiences

Shutdown Tracker is one platform with two separate application clients:

- **Master Console** — Tier 1-only project-control application with whole-project operational authority.
- **Mobile App** — Tier 2/Tier 3 assigned-task satellite application without whole-project browsing.

The clients share identity, backend, project state, and audit. They are not two responsive layouts of one application. See [Product Flow and Software Map](product-flow-and-software-map.md).

## Control model

The six primary product-authority documents are:

- [Product Flow and Software Map](product-flow-and-software-map.md)
- [User Tier and Assignment Model](user-tier-and-assignment-model.md)
- [Task Operational Model](task-operational-model.md)
- [Critical Reporting Model](critical-reporting-model.md)
- [Project Lifecycle and Import / Export](project-lifecycle-and-import-export.md)
- [Implementation Status Map](implementation-status-map.md)

Supporting product contracts include:

- [Deterministic Operational Trial](deterministic-operational-trial.md)
- [Project Operational Mapping](project-operational-mapping.md)
- [Trial Foundation Retention Map](trial-foundation-retention-map.md)
- [Communications Layer](communications-layer.md)
- [Correction and Supersession Rules](correction-and-supersession-rules.md)
- [Offline Audit and Sync Rules](offline-audit-sync-rules.md)
- [UX Anti-Slop Rules](ux-anti-slop-rules.md)
- [Design Language and Status Semantics](design-language-and-status-semantics.md)

No earlier named-role matrix or area/package/contract/watchlist scope model is authoritative.

Superseded candidate-specific technical research remains available in [Project Candidate Schedule Handoff](project-candidate-schedule-handoff.md), [Approval, Candidate Schedule, and Adoption State Model](approval-export-state-model.md), and [Task Progress Review and Project Input Approval](task-progress-review-export-approval.md). Those documents are not current authority or delivery prerequisites.

## Active product priority

The active priority is to validate the operating product before locking a Project export contract:

1. Tier 1 whole-project Console workflows;
2. Tier 2 tracking responsibility and Critical reporting;
3. Tier 3 assigned field execution;
4. Can't Start, Start, Pause, Resume, Finish, and end-of-shift progress;
5. Today, Tasks, Task Dashboard, and task-owned records; and
6. assignment, mapping, lifecycle, and offline/recovery concepts.

Imported Project sources and snapshots remain immutable. The final Project-bound input, review, candidate, recalculation, adoption, merge, and re-import design will be reconsidered after operational trials. Existing export code is experimental technical infrastructure only. See [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md).

## Task execution and progress

Ordinary Mobile field actions are Can't Start, Start, Pause, Resume, and Finish. Their event timestamps are system-captured; Tier 2/Tier 3 users do not ordinarily type execution dates/times. Can't Start leaves the task Not Started, and a pause interval remains distinct from any linked adverse delay/problem. These Tracker facts do not map one-to-one to Project fields automatically.

At end of shift, unfinished work may receive a plain-language Tracker field progress observation. Project-specific `% Work Complete` and `Physical % Complete` labels are not exposed to ordinary field users; any eventual Project interpretation remains a separate future Project-bound policy decision.

A project may configure a progress method appropriate to its work:

- duration progress (`% Complete`);
- physical-scope progress (`Physical % Complete`);
- work/assignment progress (`% Work Complete`) only where resource Work is genuinely maintained;
- state-only tracking where a percentage is inappropriate.

The current trial records Tracker progress in product language. It does not promise a one-to-one mapping to `% Complete`, `% Work Complete`, or `Physical % Complete`.

## Deferred Project export

Import / Export remains a Console section, but Export is explicitly not finalised. No exact approval pipeline, sealed preview, candidate generator, manual gate, or Project adoption workflow is current product authority. A future decision may reuse technical code only after the product contract is approved independently.

## Project Operational Mapping

Microsoft Project owns source facts. Shutdown Tracker owns the operational interpretation configured over those facts.

MVP source modes include:

- direct imported task fields/custom fields;
- WBS/hierarchy/selected summary ancestry;
- task assignments resolved through Resource `Group`.

Original Project values are never overwritten. Tracker display aliases, roll-ups, query-only Scope, Saved Views, and explicit assignment configuration remain separate.

Classification is not authorisation. Categories and saved views support filtering, grouping, display, Critical selection, and bulk Tier 2 assignment. Active membership and saved task/reporting assignments determine access.

## Critical reporting

A Critical item is an operational reporting object, not a scheduling object. The first approved Critical Work Pack UX selects one imported summary task plus descendants.

Project `Critical`, Total Slack, Free Slack, or other schedule-calculated values may be displayed as read-only Project context but do not automatically create a Critical reporting item or assignment.

Tier 1 configures a versioned per-item Critical Reporting Policy using supported interval/time/shift/request/event mechanisms and a controlled reporting-content catalogue. Templates are reusable starting configurations with isolated item overrides. Critical reporting reuses known execution facts, does not impose routine reports on every task, and is not a generic form builder or a second execution-state system.

## Task-owned operational records

Delays / Problems describe execution constraints. Actions assign ownership. Evidence stores controlled file/photo metadata. Discussion provides contextual comments. History preserves events, corrections, supersessions, and relevant handover context.

Entity-linked Discussion may support these structured records later, but comments must not replace progress, blockers, actions, evidence, completion, or explicit handover context.

## Approved application structure

Master Console:

- Today
- Tasks
- Critical
- Import / Export
- Project Settings

Mobile App:

- Assigned Tasks only

Problems, discussion, actions, evidence, and history live in the relevant Task Dashboard. Sync is a visible transport/recovery state, not Mobile navigation. Critical obligations appear inside assigned task or summary-work-pack views.

## Product boundary

Shutdown Tracker does not:

- calculate CPM, critical path, float, schedule optimisation, recovery, or resource levelling;
- silently change the accepted master schedule;
- silently merge/import into an existing master schedule;
- directly invent Project-calculated schedule consequences;
- write native `.mpp` server-side;
- infer permissions from Project categories;
- use generic chat as the source of operational truth.

Any future Microsoft Project recalculation workflow requires a new approved contract. It must remain separate from Shutdown Tracker's execution truth and must never silently overwrite the master schedule.
