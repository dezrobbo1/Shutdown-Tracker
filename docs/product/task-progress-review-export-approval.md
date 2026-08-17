# Task Progress Review and Project Input Approval

Task Progress Review connects field execution truth to a planner-controlled Microsoft Project candidate schedule.

## Product decision

Shutdown Tracker captures structured execution facts, routes them through operational review, allows a planner to approve exact Project inputs, and then hands those inputs to a controlled candidate-schedule process.

Planner input approval does **not** mean the resulting Project-calculated schedule has already been accepted.

Core workflow:

```text
field execution update
-> supervisor review
-> planner input review
-> authoritative execution candidate
-> approved-input manifest / preview
-> Microsoft Project candidate calculation
-> candidate delta review
-> planner accepts / rejects / supersedes
-> optional manual master adoption
```

## User responsibilities

| User | Responsibility | Must not be burdened with |
| --- | --- | --- |
| Field User | Record what happened at the workfront | Project field mechanics or schedule-impact review |
| Contractor | Submit scoped execution facts/evidence | Other contractors' work or planner decisions |
| Supervisor | Validate operational credibility | Final candidate-schedule adoption |
| Coordinator | Triage review queues, blockers, actions, handover | Project file mechanics |
| Shutdown Control | Maintain live operational awareness | Routine field entry |
| Planner | Approve exact Project inputs and review the recalculated candidate | Raw frontline evidence capture |
| Inspector | Review assigned quality/evidence outcomes | Schedule handoff decisions unless separately authorised |
| Viewer / Management | Read execution and candidate-impact summaries | Editable review/export controls |

## State dimensions

Do not collapse task condition into one status.

| Dimension | Examples |
| --- | --- |
| Execution state | Not started, Ready, In progress, Paused, Blocked, Completed |
| Progress review state | Draft, Submitted, Supervisor accepted, Correction requested, Rejected, Superseded |
| Planner input state | Needs review, Approved as input, Rejected, Clarification requested, Superseded |
| Candidate schedule state | Not prepared, Calculation pending, Candidate produced, Delta ready, Accepted, Rejected, Superseded |
| Adoption state | Not adopted, Adopted manually, Replaced by later master |
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

## Progress methods

A project/import profile may define the progress method that best matches the work.

| Method | Business meaning | Project field | Default product position |
| --- | --- | --- | --- |
| Duration progress | Portion of task duration completed | `% Complete` | Reviewable; handoff support must be proven |
| Physical progress | Portion of measurable physical scope completed | `Physical % Complete` | Project/site-specific; useful for quantity-based work |
| Work progress | Portion of assignment Work completed | `% Work Complete` | Deferred unless resource Work is maintained intentionally |
| State only | No percentage is meaningful | none | Always valid Tracker option |

The product must not choose a field merely because it has fewer recalculation side effects. The field must represent the business fact being reported.

## Authoritative execution candidates

An execution candidate is one immutable reviewed fact bound to:

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
2. reviewable as an execution fact;
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
- source update and actor/time;
- supervisor decision;
- evidence/blocker state;
- re-import/lineage conflict state;
- current handoff-mechanism support;
- planner approve/reject/clarify decision.

Required copy:

```text
Planner approval authorises this exact input for a candidate schedule calculation. The current master schedule is unchanged.
```

## Approved-input manifest

The manifest contains only the exact planner-approved inputs plus their authority/provenance. It does not contain guessed Project-calculated consequences.

The manifest should record:

- accepted source snapshot and source file hash;
- candidate IDs and approval IDs;
- task identities;
- approved field/value pairs;
- manifest hash;
- project/profile policy version;
- generated by/at.

## Candidate schedule calculation

The candidate is always based on a disposable copy of the accepted source.

Microsoft Project may recalculate dependent schedule state after approved inputs are applied. That may include planned dates, durations, summary roll-ups, assignment work, timephased data, slack, or criticality.

Those values must be labelled **Microsoft Project-calculated consequence**. Shutdown Tracker must not present them as if the planner directly approved them as input.

## Candidate delta review

The planner should see:

- approved inputs;
- Project-calculated schedule consequences;
- unchanged source facts;
- unexpected/unexplained changes;
- project finish movement;
- changed planned dates/durations;
- summary changes;
- assignment/work effects;
- critical/slack changes reported by Project;
- candidate and source hashes.

The planner can accept, reject, or supersede the candidate. Candidate acceptance still does not mean the master has been adopted.

## Master adoption

Master adoption is a separate planner-controlled event.

Shutdown Tracker may record adoption metadata, but must not silently overwrite or save the accepted master file.

## Summary tasks

Do not submit direct summary-task progress/actual inputs by default. Let Microsoft Project calculate roll-ups in the candidate schedule.

Project-calculated summary changes are expected candidate consequences and should be visible in the delta.

## Re-import and stale candidates

Every Project re-import creates a new immutable snapshot. Existing execution candidates remain historical and must not be silently rebound to the new snapshot.

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
- native `.mpp` writing by the server;
- automatic progress derivation from comments;
- automatic `% Work Complete` from Start/Pause timers;
- summary-task actual input;
- generic chat.

A read-only planner candidate-impact view and a separately reviewed Project-native companion are allowed by the product boundary.
