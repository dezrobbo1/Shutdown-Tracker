# Approval, Candidate Schedule, and Adoption State Model

Shutdown Tracker separates execution state, review state, Project-input authority, candidate-schedule calculation, and master adoption.

## Why the separation matters

A field user can report a task complete while:

- the update is still awaiting supervisor review;
- no planner has approved Project input;
- no candidate schedule exists;
- Microsoft Project has not recalculated anything;
- the current master remains unchanged.

Likewise, a candidate schedule may be successfully produced but rejected by the planner.

## State dimensions

### Execution state

`not_started -> ready -> in_progress -> paused/blocked -> completed`

Corrections use explicit events/supersession rather than destructive history edits.

### Progress review state

`draft -> submitted -> supervisor_accepted | correction_requested | rejected | superseded`

Supervisor acceptance means operationally credible only.

### Planner input state

`needs_planner_review -> input_approved | input_rejected | clarification_requested | superseded`

Input approval authorises one exact execution candidate for the approved-input manifest.

### Approved-input manifest state

Suggested target states:

`draft -> sealed -> approved_for_candidate_calculation -> superseded`

The sealed manifest is immutable and includes source/hash/candidate/approval provenance.

### Candidate schedule state

Suggested target states:

`not_prepared -> calculation_pending -> candidate_produced -> delta_ready -> accepted | rejected | failed | superseded`

These target states describe the product lifecycle. They do not imply that every current branch already implements them.

### Master adoption state

`not_adopted -> adopted_manually -> superseded_by_later_master`

Adoption is a separate audit fact. Candidate acceptance does not imply adoption.

### Sync state

`local_draft -> queued_on_device -> sending -> server_received | failed | conflict`

Queued is not submitted.

## Existing export-integrity batches

Current export-integrity implementations may use states such as draft preview, approved, generated, opened in Microsoft Project, verified, rejected, failed, and superseded.

Those states remain useful for authority and artifact provenance. Future candidate-schedule work should either extend them carefully or introduce a separate candidate-schedule run entity rather than overloading “verified” to mean “planner accepted the recalculated schedule.”

## Authority rules

- Field users and contractors do not approve Project input or candidate adoption.
- Supervisors validate execution truth.
- Planners approve Project inputs and candidate adoption by default.
- An approved input is bound to one exact project/snapshot/task/field/value/source/version/candidate/approval identity.
- A candidate schedule is bound to one immutable source schedule and one immutable approved-input manifest.
- A planner candidate decision is bound to one candidate hash and semantic delta.
- A later master adoption is a separate event.

## Candidate review requirements

A candidate review should show:

- source schedule identity/hash;
- candidate schedule identity/hash;
- approved-input manifest/hash;
- Project version/build used for calculation;
- approved inputs;
- Project-calculated consequences;
- unexplained changes;
- project finish movement;
- planner decision and notes.

## Provenance classification

Every source-versus-candidate difference should be classified as:

- `approved_input`;
- `project_calculated_consequence`;
- `unexpected_difference`.

Unchanged values need not be stored as delta rows but remain traceable to the source hash.

## Direct-input restrictions

Without an explicit policy change, Shutdown Tracker must not directly author:

- summary-task actuals;
- planned dates/durations;
- dependencies;
- constraints;
- calendars;
- baselines;
- WBS/outline structure;
- Project critical/slack values;
- resource levelling or schedule optimisation outputs.

Those values may change inside a Microsoft Project-calculated candidate and be shown to the planner.

## Immutability and corrections

- Source schedule files/snapshots are immutable.
- Execution candidates and approval events are append-only.
- Approved-input manifests are sealed and immutable.
- Candidate schedules and deltas are immutable artifacts once produced.
- Rejected and superseded candidates remain visible in history.
- Corrections create new candidates/manifests/runs rather than editing prior evidence.

## Required user-facing wording

Before candidate calculation:

```text
Approved for candidate calculation. Current master schedule unchanged.
```

After candidate produced:

```text
Candidate schedule produced by Microsoft Project. Review calculated impacts before adoption.
```

After candidate acceptance:

```text
Candidate accepted for planner use. Master adoption is still a separate action.
```

After manual adoption is recorded:

```text
Planner recorded this candidate as adopted into the next master schedule.
```
