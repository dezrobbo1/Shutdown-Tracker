# Task Progress Review and Project Input Approval

Task Progress Review connects field execution truth and authorised planner Console input to a planner-controlled Microsoft Project candidate schedule.

## Product decision

Shutdown Tracker captures structured execution facts, routes field-originated facts through operational review, allows authorised planners to enter or correct permitted inputs in the Master Console, and then creates an approved input set for a complete updated Project candidate.

The candidate is opened/imported in Microsoft Project, Microsoft Project recalculates it, and the planner reviews the resulting schedule before deciding whether to reject it, retain it, use it as the next schedule/master, or merge/import it into another existing schedule.

Planner input approval does **not** mean the resulting Project-calculated schedule has already been accepted or adopted.

Core workflow:

```text
field execution update and/or authorised planner Console input
-> supervisor review where policy requires
-> planner input review
-> authoritative input candidates
-> sealed approved-input manifest / preview
-> complete updated Project candidate generated
-> Microsoft Project opens/imports and recalculates candidate
-> candidate delta review
-> planner chooses reject / retain / use as next schedule / merge-import
-> adoption or merge outcome recorded separately
```

## Input origins

An input may originate from:

- field user execution capture;
- supervisor correction of a field update;
- planner entry or correction in the Master Console; or
- another structured source explicitly authorised by project policy.

Planner-originated input does not become unaudited or implicitly trusted. It must still carry:

- actor and timestamp;
- accepted source snapshot/file identity;
- imported task identity;
- current source value;
- proposed value;
- source reason/context;
- handoff policy/support state;
- approval decision.

A project policy may allow a planner-originated input to skip supervisor review when operational validation is not required, but it must not skip planner input authority, provenance, stale-data checks, or candidate preview.

## User responsibilities

| User | Responsibility | Must not be burdened with |
| --- | --- | --- |
| Field User | Record what happened at the workfront | Project field mechanics or schedule-impact review |
| Contractor | Submit scoped execution facts/evidence | Other contractors' work or planner decisions |
| Supervisor | Validate operational credibility | Final candidate-schedule adoption |
| Coordinator | Triage review queues, blockers, actions, handover | Project file mechanics |
| Shutdown Control | Maintain live operational awareness | Routine planner file operations |
| Planner | Enter/correct permitted inputs, approve exact Project inputs, review recalculated candidate, choose final disposition | Raw frontline evidence capture unless needed |
| Inspector | Review assigned quality/evidence outcomes | Schedule handoff decisions unless separately authorised |
| Viewer / Management | Read execution and candidate-impact summaries | Editable review/handoff controls |

## State dimensions

Do not collapse task condition into one status.

| Dimension | Examples |
| --- | --- |
| Execution state | Not started, Ready, In progress, Paused, Blocked, Completed |
| Progress review state | Draft, Submitted, Supervisor accepted, Correction requested, Rejected, Superseded |
| Planner input state | Needs review, Approved as input, Rejected, Clarification requested, Superseded |
| Candidate schedule state | Not prepared, Calculation pending, Candidate produced, Delta ready, Accepted, Rejected, Superseded |
| Candidate disposition | Retained, Adopted as next schedule, Merged/imported into existing, Superseded |
| Sync state | Local draft, Queued, Sending, Server received, Failed, Conflict |

## Execution actions

| Field action | Tracker meaning | Automatic Project mapping? |
| --- | --- | --- |
| Start | Work genuinely started at a recorded time | No; may create an Actual Start candidate after review |
| Pause | Temporary stop with reason | No |
| Resume | Work restarted | No |
| Block | Work cannot continue; create/link a Problem | No |
| Progress update | Report measured progress using configured method | No automatic mapping until reviewed |
| Complete | Field completion claim with evidence/policy checks | No; may create one or more review candidates |

Start/Pause/Resume/Block/Complete are execution events, not Project field aliases.

## Planner Console entry

The Master Console may allow an authorised planner to enter or correct Project-bound execution facts that are enabled by the active project/handoff policy.

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
2. reviewable as a field or planner-entered fact;
3. authorised as a direct Project input by product policy;
4. supported by the selected handoff mechanism;
5. enabled for the current project/profile.

A failed test of a patch-shaped MSPDI mechanism does not permanently prohibit the field. It proves only that the mechanism is not yet sufficient for that field.

## Supervisor review

Supervisor review confirms operational credibility. It does not approve Project input or candidate adoption.

Possible decisions:

- accept;
- request correction;
- reject;
- request evidence;
- link blocker/problem;
- include in handover.

Required copy:

```text
Supervisor review confirms operational validity. It does not approve a Microsoft Project schedule change.
```

## Planner input review

The planner decides whether a reviewed fact may be included in the approved-input manifest.

The queue should show:

- source snapshot/file identity;
- imported task UID/ID/name and leaf/summary state;
- current Project value;
- proposed value;
- input origin: field / supervisor correction / planner Console / other approved source;
- source actor/time;
- supervisor decision where required;
- evidence/blocker state;
- re-import/lineage conflict state;
- current handoff-mechanism support;
- planner approve/reject/clarify decision.

Required copy:

```text
Planner approval authorises this exact input for an updated Project candidate. The current master schedule is unchanged.
```

## Approved-input manifest

The manifest contains only the exact planner-approved inputs plus their authority/provenance. It does not contain guessed Project-calculated consequences.

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

Those values must be labelled **Microsoft Project-calculated consequence**. Shutdown Tracker must not present them as if the planner directly approved them as input.

## Candidate delta review

The planner should see:

- approved inputs;
- Project-calculated schedule consequences;
- planner edits made in Microsoft Project, if any;
- unchanged source facts;
- unexpected/unexplained changes;
- project finish movement;
- changed planned dates/durations;
- summary changes;
- assignment/work effects;
- critical/slack changes reported by Project;
- candidate and source hashes.

## Candidate disposition

After review the planner may:

- **Reject** — candidate remains evidence only.
- **Retain for further review** — candidate remains separate from the master.
- **Use as next schedule/master** — planner adopts the reviewed candidate as the next controlled schedule.
- **Merge/import into existing schedule** — planner uses Microsoft Project to merge/import the candidate into a disposable/backed-up existing schedule and reviews the merged result.

Candidate acceptance does not itself perform adoption or merge.

## Merge/import control

Merge/import is a Microsoft Project operation controlled by the planner.

Shutdown Tracker should record:

- candidate hash;
- destination schedule identity/hash before merge;
- Microsoft Project version/build;
- merge/import mode;
- warnings/conflicts;
- result schedule identity/hash;
- planner decision.

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

A read-only planner candidate-impact view and a separately reviewed Project-native companion are allowed by the product boundary.
