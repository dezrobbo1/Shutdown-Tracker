# Research Decisions Summary

> **Historical research synthesis.** The planner/supervisor roles, candidate pipeline, and navigation described below predate [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md) and the approved Tier 1/Tier 2/Tier 3 two-client model. They are retained as research provenance and are not current product authority or an implementation roadmap.

This file is a decision-oriented historical index. Accepted ADRs and current product documents take precedence over research summaries when wording conflicts.

## Historical executive decision

Shutdown Tracker is a live execution-control system. Microsoft Project remains the schedule calculation and master-file authority.

The clarified handoff model is:

```text
field execution information
+ authorised planner Console input
-> supervisor/planner review as policy requires
-> approved input manifest
-> complete updated MSPDI/XML candidate generated from accepted source
-> candidate opened/imported in Microsoft Project
-> Microsoft Project recalculates
-> planner reviews source-versus-candidate impact
-> planner chooses reject / retain / use as next schedule / merge-import
```

The supporting research explicitly allows approved actual/progress inputs while warning that Microsoft Project recalculates interdependent values. Therefore “do not build a scheduler” means Shutdown Tracker must not calculate those consequences itself; it does not mean Project must be prevented from recalculating a useful updated candidate.

The intended product output is not merely a sparse patch. It is a complete updated Project candidate that a planner can review and deliberately use.

## Historical product decisions

| Area | Decision |
| --- | --- |
| Product identity | Live shutdown execution-control and Project candidate-preparation platform |
| Microsoft Project role | Schedule calculation and Project-file review environment |
| Shutdown Tracker role | Execution inputs, planner inputs, review, evidence, handover, operational mapping, candidate preparation, audit |
| Planner role | Enter/correct permitted inputs, approve exact inputs, review candidate, decide final disposition |
| Scheduling logic | Do not calculate CPM, float, critical path, levelling, recovery or dependency consequences in Tracker |
| Candidate output | Complete updated Project schedule candidate from accepted source plus approved inputs |
| Candidate recalculation | Allowed and expected in Microsoft Project on a disposable candidate |
| Candidate outcomes | Reject, retain, use as next schedule/master, or merge/import into another existing schedule |
| Master update | Never silent; adoption/merge is a separate planner-controlled decision |
| Interchange | MSPDI/XML primary open format; Project-native companion remains a possible reviewed future mechanism |
| Native `.mpp` writer | Do not build server-side; planner may save Project files using Microsoft Project |
| Import model | Immutable Project snapshots |
| Audit | Append-only high-value events and immutable candidate/artifact/adoption/merge provenance |
| Offline | IndexedDB queue, visible sync state, idempotency; Background Sync only as enhancement |
| Communications | Entity-linked Discussion later; structured records first |
| UX | Operational and narrow; candidate-impact review allowed, no Tracker scheduling editor |

## Input origins

Project-bound inputs may originate from:

- field execution/progress capture;
- supervisor correction;
- authorised planner entry/correction in the Master Console;
- another explicitly authorised structured source under project policy.

Planner Console input must retain actor/time, source snapshot, task identity, old/new value, policy, and approval provenance. It does not become an unaudited shortcut.

## Progress-field decisions

Do not confuse Microsoft Project field semantics:

- `% Complete` — duration progress;
- `Physical % Complete` — measured physical-scope progress;
- `% Work Complete` — assignment/resource Work progress.

Start/Pause/Resume/Block/Complete are Tracker execution events. They do not automatically map to a percentage field.

The candidate vocabulary may recognise common actual/progress facts, but each field also needs separate product-input policy, handoff-mechanism compatibility, and project/profile enablement.

A failed patch-shaped MSPDI diagnostic is evidence against that handoff mechanism, not permanent evidence that the business fact can never be used.

## Candidate-schedule impact

Microsoft Project may recalculate:

- planned dates;
- task/summary duration;
- summary roll-ups;
- actual/remaining duration;
- assignment work and progress;
- timephased data;
- slack and criticality.

Those changes are expected candidate consequences when Project produces them. Shutdown Tracker must not silently pre-compute or inject them as unapproved inputs.

Candidate review should distinguish:

- approved Tracker input;
- Microsoft Project-calculated consequence;
- planner edit performed in Microsoft Project;
- unexpected/unexplained difference.

## Candidate disposition

After review the planner may:

1. reject the candidate;
2. retain it for further review;
3. use it as the next controlled schedule/master;
4. use Microsoft Project to merge/import it into another existing schedule.

Adoption as the next schedule and merge/import into another schedule are separate auditable outcomes. A candidate opening successfully does not prove either occurred.

Merge/import must be tested separately from standalone candidate use because Project matching, UID behaviour, overwrite/duplication and conflict handling can differ. Initial merge tests must use disposable/backed-up destination schedules.

## Operational Mapping

Planner-configurable source modes:

- task fields/custom fields;
- hierarchy/WBS/summary ancestry;
- assigned resource -> Resource.Group.

Real schedule research shows different hierarchy depths and potentially multi-valued Resource Groups, so mappings must be evidence-driven and revalidated per snapshot.

## Critical Watch

Critical Watch is an operational reporting construct. It may use imported hierarchy/categories but must not be equated with Project Critical/slack or a Tracker-calculated critical path.

## UX

Master Console top-level zones:

- Today
- Tasks
- Problems
- Evidence
- Exports

Field App top-level zones:

- My Work
- Today
- Problems
- Evidence
- Sync

A read-only source-versus-candidate schedule impact view is allowed for planner review. Editable schedule planning remains in Microsoft Project unless a later explicit product decision expands direct schedule-editing authority.

## Communications

Build structured execution records first. Entity-linked Discussion may support tasks, Problems, Actions, Evidence, Handover, and Project review. Generic chat must not become the operational source of truth.

## Historical follow-on architecture questions

The most important unresolved implementation question is **how to apply the exact approved input manifest through Microsoft Project reliably while producing a complete updated candidate schedule**.

Candidate approaches:

1. complete-source MSPDI candidate generation;
2. planner-controlled Microsoft Project companion operating on a disposable copy;
3. manual planner input package as a fallback.

The authority, audit, candidate-review, adoption, and merge-provenance model should remain the same regardless of mechanism.
