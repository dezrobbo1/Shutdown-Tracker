# Task Progress Review and Project Input Approval

> **Superseded technical research.** [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md) makes operational trial the active priority and defers the final Project-bound input, approval, and round-trip design. This document is not a delivery prerequisite.

Task Progress Review connects assigned field execution truth and authorised Tier 1 Console input to a Tier 1-controlled Microsoft Project candidate schedule.

## Product decision

Shutdown Tracker captures structured execution facts, allows Tier 2 to maintain tracking responsibility for assigned work, allows Tier 1 to enter or correct permitted inputs in the Master Console, and then creates an exactly approved input set for a complete updated Project candidate.

The relevant schedule owner or Microsoft Project operator opens/imports the candidate in Microsoft Project, Microsoft Project recalculates it, and Tier 1 reviews the resulting schedule before recording whether to reject it, retain it, adopt it as the next schedule/master, or have it merged/imported into another existing schedule.

Tier 1 input approval does **not** mean the resulting Project-calculated schedule has already been accepted or adopted.

Core workflow:

```text
Tier 2/Tier 3 execution update and/or authorised Tier 1 Console input
-> Tier 2 tracking validation where project policy requires it
-> Tier 1 Project-input review
-> authoritative input candidates
-> sealed approved-input manifest / preview
-> complete updated Project candidate generated
-> Microsoft Project opens/imports and recalculates candidate
-> candidate delta review
-> Tier 1 chooses reject / retain / use as next schedule / merge-import
-> adoption or merge outcome recorded separately
```

## Input origins

An input may originate from:

- Tier 2 or Tier 3 execution capture on an explicitly assigned task;
- Tier 2 correction or clarification within retained tracking responsibility;
- Tier 1 entry or correction in the Master Console; or
- another structured source explicitly authorised by project policy.

Tier 1-originated input does not become unaudited or implicitly trusted. It must still carry:

- actor and timestamp;
- accepted source snapshot/file identity;
- imported task identity;
- current source value;
- proposed value;
- source reason/context;
- handoff policy/support state;
- approval decision.

A Tier 1-originated input may bypass Tier 2 tracking validation when operational validation is not required, but it must not bypass Tier 1 input authority, provenance, stale-data checks, exact approval binding, or candidate preview.

## User responsibilities

| Tier | Responsibility | Must not be burdened with |
| --- | --- | --- |
| Tier 1 | Whole-project execution authority; enter/correct permitted inputs; approve exact Project inputs; review recalculated candidate; choose disposition | No artificial category or saved-view restriction |
| Tier 2 | Track tasks assigned by Tier 1; update them; assign field work to direct-report Tier 3 while retaining responsibility; submit assigned Critical reports | Whole-project browsing or Microsoft Project file mechanics |
| Tier 3 | Update tasks assigned by Tier 2 as `WORKING_ON` or `FIELD_CONTROL` | Assigning work, whole-project browsing, or Project-input approval |

## State dimensions

Do not collapse task condition into one status.

| Dimension | Examples |
| --- | --- |
| Execution state | Not Started, In Progress, Paused, Completed |
| Operational condition / attention | Late to Start, delayed/blocked before start, adverse delay/block, running beyond planned finish |
| Tracking review state | Draft, Submitted, Tier 2 validated where required, Correction requested, Rejected, Superseded |
| Tier 1 input state | Needs review, Approved as input, Rejected, Clarification requested, Superseded |
| Candidate schedule state | Not prepared, Calculation pending, Candidate produced, Delta ready, Accepted, Rejected, Superseded |
| Candidate disposition | Retained, Adopted as next schedule, Merged/imported into existing, Superseded |
| Sync state | Local draft, Queued, Sending, Server received, Failed, Conflict |

## Execution actions

| Field action | Tracker meaning | Automatic Project mapping? |
| --- | --- | --- |
| Can't Start | System-timestamped blocked-before-start observation; execution remains Not Started; capture reason/need and link action/problem where appropriate | No |
| Start | System-timestamped evidence that work genuinely started; late-start context is requested only when late | No; may create an Actual Start candidate after review |
| Pause | System-timestamped temporary stop; capture reason and separately classify/link any adverse delay/problem | No |
| Resume | System-timestamped restart that closes the pause interval without silently closing a linked problem | No |
| Finish | System-timestamped field completion claim with confirmation and configured evidence/policy checks | No; may create one or more review candidates |
| End-of-shift observation | Plain-language completion percentage, remaining work, next-shift issue, and optional note/evidence for unfinished work | No automatic mapping until reviewed |

Can't Start/Start/Pause/Resume/Finish are the ordinary Mobile execution actions, not Project field aliases. Tier 2/Tier 3 users do not ordinarily type Actual Start/Actual Finish or execution date/time values. Any future manual correction/backdating is a separate audited workflow.

## Tier 1 Console entry

The Master Console may allow Tier 1 to enter or correct Project-bound execution facts that are enabled by the active project/handoff policy.

Examples may include:

- reviewed percent complete;
- physical percent complete where the project uses it;
- actual start;
- actual finish;
- another explicitly authorised execution/tracking field added by later policy.

The Console must not silently become a second Project schedule editor. Planned dates, predecessors, constraints, calendars, resource levelling, baselines, and other schedule-logic fields remain Microsoft Project editing responsibilities unless a later explicit product/ADR decision expands direct input authority.

## Progress methods

A project/import profile may define the progress method that best matches the work.

| Method | Business meaning | Project field | Default product position |
| --- | --- | --- | --- |
| Duration progress | Portion of task duration completed | `% Complete` | Reviewable; handoff support must be proven |
| Physical progress | Portion of measurable physical scope completed | `Physical % Complete` | Project/site-specific; useful for quantity-based work |
| Work progress | Portion of assignment Work completed | `% Work Complete` | Deferred unless resource Work is maintained intentionally |
| State only | No percentage is meaningful | none | Always valid Tracker option |

The product must not choose a field merely because it has fewer recalculation side effects. The field must represent the business fact being reported.

These Project methods govern later reviewed interpretation. Ordinary Mobile users answer plain operational questions and are not shown `% Work Complete` or `Physical % Complete` field terminology.

## Authoritative input candidates

An input candidate is one immutable reviewed fact bound to:

- project and accepted snapshot;
- imported task identity;
- field;
- captured old value;
- proposed value;
- source record/version;
- source actor/time;
- fingerprint;
- exact approval event.

Creating a candidate does not approve it. Approvals, rejection, correction requests, and supersession must identify the exact candidate.

## Field support is multi-dimensional

For every possible Project input, track separately whether it is:

1. recognised by the importer/candidate vocabulary;
2. reviewable as a field or Tier 1-entered fact;
3. authorised as a direct Project input by product policy;
4. supported by the selected handoff mechanism;
5. enabled for the current project/profile.

A failed test of a patch-shaped MSPDI mechanism does not permanently prohibit the field. It proves only that the mechanism is not yet sufficient for that field.

## Tier 2 tracking validation

Tier 2 retains tracking responsibility for assigned tasks. Where project policy requires field validation, Tier 2 may validate, correct, reject, request evidence, or request clarification for a Tier 3 update inside the same Task Detail workflow. This is not a mandatory separate application screen.

Possible decisions:

- accept;
- request correction;
- reject;
- request evidence;
- link blocker/problem;
- include in handover.

Required copy:

```text
Tier 2 tracking validation confirms operational credibility where required. It does not approve a Microsoft Project input or schedule change.
```

## Tier 1 input review

Tier 1 decides whether a reviewed fact may be included in the approved-input manifest.

The queue should show:

- source snapshot/file identity;
- imported task UID/ID/name and leaf/summary state;
- current Project value;
- proposed value;
- input origin: Tier 2/Tier 3 field capture / Tier 2 correction / Tier 1 Console / other approved source;
- source actor/time;
- Tier 2 tracking decision where required;
- evidence/blocker state;
- re-import/lineage conflict state;
- current handoff-mechanism support;
- Tier 1 approve/reject/clarify decision.

Required copy:

```text
Tier 1 approval authorises this exact input for an updated Project candidate. The current master schedule is unchanged.
```

## Approved-input manifest

The manifest contains only the exact Tier 1-approved inputs plus their authority/provenance. It does not contain guessed Project-calculated consequences.

The manifest should record:

- accepted source snapshot and source file hash;
- candidate IDs and approval IDs;
- task identities;
- approved field/value pairs;
- input origin and actor/time;
- manifest hash;
- project/profile policy version;
- generated by/at.

## Complete updated candidate generation

The target handoff output is a **complete updated Project candidate schedule**, normally MSPDI/XML, built from the accepted source plus the approved-input manifest.

It must not be a sparse patch presented as though it were a complete schedule.

The candidate is always separate from the accepted source/master.

After it is opened/imported in Microsoft Project, Microsoft Project may recalculate dependent schedule state. That may include planned dates, durations, summary roll-ups, assignment work, timephased data, slack, or criticality.

Those values must be labelled **Microsoft Project-calculated consequence**. Shutdown Tracker must not present them as if Tier 1 directly approved them as input.

## Candidate delta review

Tier 1 should see:

- approved inputs;
- Project-calculated schedule consequences;
- manual schedule-owner or Microsoft Project operator edits made in Microsoft Project, if any;
- unchanged source facts;
- unexpected/unexplained changes;
- project finish movement;
- changed planned dates/durations;
- summary changes;
- assignment/work effects;
- critical/slack changes reported by Project;
- candidate and source hashes.

## Candidate disposition

After review Tier 1 may record:

- **Reject** — candidate remains evidence only.
- **Retain for further review** — candidate remains separate from the master.
- **Use as next schedule/master** — Tier 1 records the adopt disposition and the relevant schedule owner or Microsoft Project operator performs the controlled external adoption.
- **Merge/import into existing schedule** — Tier 1 records the merge disposition and the relevant schedule owner or Microsoft Project operator uses Microsoft Project against a disposable/backed-up existing schedule; Tier 1 then reviews the merged result.

Candidate acceptance does not itself perform adoption or merge.

## Merge/import control

Merge/import is an external Microsoft Project operation under Tier 1-controlled disposition. It is performed by the relevant schedule owner or Microsoft Project operator; that business description is not an application role.

Shutdown Tracker should record:

- candidate hash;
- destination schedule identity/hash before merge;
- Microsoft Project version/build;
- merge/import mode;
- warnings/conflicts;
- result schedule identity/hash;
- Tier 1 decision.

Shutdown Tracker must not silently overwrite the only master copy.

## Summary tasks

Do not submit direct summary-task progress/actual inputs by default. Let Microsoft Project calculate roll-ups in the candidate schedule.

Project-calculated summary changes are expected candidate consequences and should be visible in the delta.

## Re-import and stale candidates

Every Project re-import creates a new immutable snapshot. Existing input candidates remain historical and must not be silently rebound to the new snapshot.

Continued handoff requires a fresh candidate against the newly accepted snapshot and revalidation of task lineage, baseline, field support, and approval.

## Problems, Actions, Evidence, and Handover

Progress review is not just a percentage screen. Link structured operational records:

| User input | Should become |
| --- | --- |
| Scaffold unavailable | Problem/blocker |
| Permit or isolation not ready | Problem/blocker and possible handover |
| Material missing | Problem/blocker |
| Crane delayed | Problem plus Action |
| Quality hold | Problem plus Evidence requirement |
| Follow up by a time | Action |
| Completion photo missing | Evidence gap |
| Incoming shift must know | Handover |

## Offline rules

- Queued is not submitted.
- Store local capture time and server received time.
- Use idempotency keys.
- Show per-item sync state.
- Failed updates remain visible and retryable.

## Non-goals

This workflow does not build:

- a Shutdown Tracker scheduling engine;
- hidden Project write-back;
- unattended master overwrite or merge;
- native `.mpp` writing by the server;
- automatic progress derivation from comments;
- automatic `% Work Complete` from Start/Pause timers;
- summary-task actual input;
- generic chat.

A read-only Tier 1 candidate-impact view and a separately reviewed Project-native companion are allowed by the product boundary.
