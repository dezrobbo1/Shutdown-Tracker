# Product

## Product modules

- Project import and immutable snapshots
- Imported WBS, tasks, resources, assignments, calendars, and custom-field metadata
- Project Operational Mapping and Source Catalogue
- Versioned Import Profiles and Operational Categories
- Query-only Operational Scope and Saved Views
- Task execution and structured progress
- Tier 1 input review
- Project Candidate Schedule Handoff
- Task-owned Delays / Problems and Actions
- Task-owned Evidence, Discussion, and History
- Critical items, Critical Work Packs, reporting policies, and immutable reports
- Candidate/input approval, candidate-schedule review, adoption/merge disposition, and audit
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

- [Project Candidate Schedule Handoff](project-candidate-schedule-handoff.md)
- [Project Operational Mapping](project-operational-mapping.md)
- [Approval, Candidate Schedule, and Adoption State Model](approval-export-state-model.md)
- [Task Progress Review and Project Input Approval](task-progress-review-export-approval.md)
- [Communications Layer](communications-layer.md)
- [Correction and Supersession Rules](correction-and-supersession-rules.md)
- [Offline Audit and Sync Rules](offline-audit-sync-rules.md)
- [UX Anti-Slop Rules](ux-anti-slop-rules.md)
- [Design Language and Status Semantics](design-language-and-status-semantics.md)

No earlier named-role matrix or area/package/contract/watchlist scope model is authoritative.

## Core Project handoff model

The product deliberately separates three authorities:

1. **Execution/input authority** — Shutdown Tracker captures and approves exact field and authorised Tier 1 inputs.
2. **Microsoft Project calculation authority** — Microsoft Project recalculates the complete updated candidate schedule.
3. **Candidate/adoption authority** — the Tier 1 schedule owner decides how the recalculated candidate is used.

The workflow is:

```text
field execution information
+ authorised Tier 1 Console input
-> Tier 1 review
-> approved-input manifest
-> complete updated MSPDI/XML candidate generated from accepted source
-> candidate opened/imported in Microsoft Project
-> Microsoft Project recalculation
-> source-versus-candidate delta
-> Tier 1 candidate review
-> choose one:
     reject
     retain for further review
     use as next schedule/master
     merge/import into another existing Project schedule
```

The accepted source/master remains immutable throughout candidate preparation and review.

The product handoff is therefore not merely a patch export. Its useful outcome is a **complete updated Project schedule candidate** that can be reviewed and then deliberately adopted or merged by the Tier 1 schedule owner through Microsoft Project.

## Input origins

Project-bound inputs may originate from:

- field execution/progress capture;
- Tier 1-reviewed field corrections;
- authorised Tier 1 entry or correction in the Master Console;
- another explicitly authorised structured source under project policy.

Tier 1 Console input does not bypass provenance or authority checks. Each direct input remains bound to actor, time, source snapshot, task, old value, new value, handoff policy, and approval state.

## Task execution and progress

Field actions such as Start, Pause, Resume, Block, and Complete are Tracker execution events. They do not map one-to-one to Project fields automatically.

A project may configure a progress method appropriate to its work:

- duration progress (`% Complete`);
- physical-scope progress (`Physical % Complete`);
- work/assignment progress (`% Work Complete`) only where resource Work is genuinely maintained;
- state-only tracking where a percentage is inappropriate.

Candidate recognition, Tier 1 reviewability, product input authority, handoff-mechanism support, and project enablement are separate dimensions. A field can be reviewable without being supported by the current handoff mechanism.

## Candidate schedule review

A Tier 1 review should distinguish:

- approved Shutdown Tracker input;
- Microsoft Project-calculated consequence;
- Tier 1 schedule-owner edit made in Microsoft Project;
- unchanged source fact;
- unexpected/unexplained difference.

A read-only schedule-impact view is allowed. It may show planned-date movement, project finish movement, summary roll-ups, resource/assignment effects, and Project-reported critical/slack changes. It must not become an editable scheduling surface or a second calculation engine.

## Candidate disposition

After review the Tier 1 schedule owner may:

- reject the candidate;
- retain it for further review;
- adopt it as the next controlled schedule/master; or
- use Microsoft Project to merge/import it into another existing Project schedule.

Adoption and merge/import are separate auditable actions. Candidate generation or acceptance does not imply either occurred.

A merge/import workflow must be proven separately from standalone candidate use and should initially operate through Microsoft Project against a disposable/backed-up destination schedule, with destination-before and result-after hashes recorded.

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

Microsoft Project may recalculate a complete updated candidate schedule. Those consequences are expected review data, not a violation of the product boundary.
