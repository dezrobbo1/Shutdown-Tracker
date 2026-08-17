# Product

## Product modules

- Project import and immutable snapshots
- Imported WBS, tasks, resources, assignments, calendars, and custom-field metadata
- Project Operational Mapping and Source Catalogue
- Versioned Import Profiles and Operational Categories
- Scope and Saved Operational Views
- Task execution and structured progress
- Supervisor Review and Planner Input Review
- Project Candidate Schedule Handoff
- Problems and Actions
- Evidence and Handover
- Critical Watchlists, Critical Work Packages, Reporting Policies, and Critical Updates
- Candidate/input approval, candidate-schedule review, adoption/merge disposition, and audit
- Entity-linked Discussion / Communications Layer
- Users, roles, permissions, responsibility scopes, and delegation
- Offline sync queue

## Application experiences

Shutdown Tracker has two application experiences backed by one platform model:

- **Master Console** — desktop-optimised for shutdown control, planners, coordinators, supervisors, package owners, and managers.
- **Field App** — mobile-optimised for field supervisors, leading hands, contractors, inspectors, and execution crews.

Browser and installed delivery channels must not fork identity, project state, permissions, workflow authority, or audit.

## Control model

Read these sources before implementing a workflow:

- [Project Candidate Schedule Handoff](project-candidate-schedule-handoff.md)
- [Project Operational Mapping](project-operational-mapping.md)
- [Roles and Capabilities](roles-and-capabilities.md)
- [Permission Matrix](permission-matrix.md)
- [Approval, Candidate Schedule, and Adoption State Model](approval-export-state-model.md)
- [Task Progress Review and Project Input Approval](task-progress-review-export-approval.md)
- [Communications Layer](communications-layer.md)
- [Correction and Supersession Rules](correction-and-supersession-rules.md)
- [Offline Audit and Sync Rules](offline-audit-sync-rules.md)
- [Critical Watchlist Permissions](critical-watchlist-permissions.md)
- [UX Anti-Slop Rules](ux-anti-slop-rules.md)
- [Design Language and Status Semantics](design-language-and-status-semantics.md)

## Core Project handoff model

The product deliberately separates three authorities:

1. **Execution/input authority** — Shutdown Tracker captures and approves exact field and authorised planner inputs.
2. **Microsoft Project calculation authority** — Microsoft Project recalculates the complete updated candidate schedule.
3. **Planner candidate/adoption authority** — the planner decides how the recalculated candidate is used.

The workflow is:

```text
field execution information
+ authorised planner Console input
-> supervisor/planner review as policy requires
-> approved-input manifest
-> complete updated MSPDI/XML candidate generated from accepted source
-> candidate opened/imported in Microsoft Project
-> Microsoft Project recalculation
-> source-versus-candidate delta
-> planner candidate review
-> choose one:
     reject
     retain for further review
     use as next schedule/master
     merge/import into another existing Project schedule
```

The accepted source/master remains immutable throughout candidate preparation and review.

The product handoff is therefore not merely a patch export. Its useful outcome is a **complete updated Project schedule candidate** that can be reviewed and then deliberately adopted or merged by the planner.

## Input origins

Project-bound inputs may originate from:

- field execution/progress capture;
- supervisor-reviewed field corrections;
- authorised planner entry or correction in the Master Console;
- another explicitly authorised structured source under project policy.

Planner Console input does not bypass provenance or authority checks. Each direct input remains bound to actor, time, source snapshot, task, old value, new value, handoff policy, and approval state.

## Task execution and progress

Field actions such as Start, Pause, Resume, Block, and Complete are Tracker execution events. They do not map one-to-one to Project fields automatically.

A project may configure a progress method appropriate to its work:

- duration progress (`% Complete`);
- physical-scope progress (`Physical % Complete`);
- work/assignment progress (`% Work Complete`) only where resource Work is genuinely maintained;
- state-only tracking where a percentage is inappropriate.

Candidate recognition, planner reviewability, product input authority, handoff-mechanism support, and project enablement are separate dimensions. A field can be reviewable without being supported by the current handoff mechanism.

## Candidate schedule review

A planner review should distinguish:

- approved Shutdown Tracker input;
- Microsoft Project-calculated consequence;
- planner edit made in Microsoft Project;
- unchanged source fact;
- unexpected/unexplained difference.

A read-only schedule-impact view is allowed. It may show planned-date movement, project finish movement, summary roll-ups, resource/assignment effects, and Project-reported critical/slack changes. It must not become an editable scheduling surface or a second calculation engine.

## Candidate disposition

After review the planner may:

- reject the candidate;
- retain it for further review;
- adopt it as the next controlled schedule/master; or
- use Microsoft Project to merge/import it into another existing Project schedule.

Adoption and merge/import are separate auditable actions. Candidate generation or acceptance does not imply either occurred.

A merge/import workflow must be proven separately from standalone candidate use and should initially operate against a disposable/backed-up destination schedule, with destination-before and result-after hashes recorded.

## Project Operational Mapping

Microsoft Project owns source facts. Shutdown Tracker owns the operational interpretation configured over those facts.

MVP source modes include:

- direct imported task fields/custom fields;
- WBS/hierarchy/selected summary ancestry;
- task assignments resolved through Resource `Group`.

Original Project values are never overwritten. Tracker display aliases, roll-ups, Scope, Saved Views, and responsibility configuration remain separate.

Classification is not authorisation. Visibility/relevance, responsibility, task-update authority, review authority, and Project-input authority are separate.

## Critical Watch

A Critical Watchlist is an operational reporting list. A Critical Work Package is a reporting object, not a scheduling object.

Project `Critical`, Total Slack, Free Slack, or other schedule-calculated values may be displayed as read-only Project context but do not automatically define Critical Watch membership.

## Problems, Actions, Evidence, Handover, and Discussion

Problems describe execution constraints. Actions assign ownership. Evidence stores controlled file/photo metadata. Handover is explicit shift-transfer information.

Entity-linked Discussion may support these structured records later, but comments must not replace progress, blockers, actions, evidence, or handover.

## Top-level navigation

Master Console:

- Today
- Tasks
- Problems
- Evidence
- Exports

Field App:

- My Work
- Today
- Problems
- Evidence
- Sync

Planner candidate review, Project verification, import review, and operational-mapping setup belong under existing planner/project surfaces rather than becoming permanent top-level dashboard zones.

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
