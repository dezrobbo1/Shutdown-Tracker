# Approval, Candidate Schedule, and Adoption State Model

Shutdown Tracker separates execution state, review state, Project-input authority, candidate-schedule calculation, candidate disposition, and later schedule adoption/merge.

## Why the separation matters

A field user can report a task complete while:

- the update is still awaiting supervisor review;
- no planner has approved Project input;
- no updated candidate schedule exists;
- Microsoft Project has not recalculated anything;
- the current master remains unchanged.

Likewise, a complete candidate schedule may be successfully produced and still be rejected, retained for review, adopted as the next schedule, or merged/imported into another schedule.

## State dimensions

### Execution state

`not_started -> ready -> in_progress -> paused/blocked -> completed`

Corrections use explicit events/supersession rather than destructive history edits.

### Progress review state

`draft -> submitted -> supervisor_accepted | correction_requested | rejected | superseded`

Supervisor acceptance means operationally credible only.

### Planner input state

`needs_planner_review -> input_approved | input_rejected | clarification_requested | superseded`

Input approval authorises one exact input candidate for the approved-input manifest.

An authorised planner may also originate or correct a permitted input in the Master Console. That origin does not remove attribution, stale-data checks, policy checks, or planner input authority.

### Approved-input manifest state

Suggested target states:

`draft -> sealed -> approved_for_candidate_calculation -> superseded`

The sealed manifest is immutable and includes source/hash/candidate/approval/input-origin provenance.

### Candidate schedule state

Suggested target states:

`not_prepared -> calculation_pending -> candidate_produced -> delta_ready -> review_pending -> accepted | rejected | failed | superseded`

These target states describe the product lifecycle. They do not imply that every current branch already implements them.

### Candidate disposition state

After candidate review:

`none -> retained_for_review | adopted_as_new_master | merged_into_existing | rejected | superseded`

Candidate acceptance and candidate disposition are separate concepts. `accepted` means the candidate is considered valid for planner use; it does not itself mean the master has changed.

### Merge/import state

Where merge/import is supported:

`not_requested -> merge_pending -> merge_result_ready -> merge_accepted | merge_rejected | failed`

The merge/import operation is performed in Microsoft Project against a disposable/backed-up destination schedule. The destination-before and result-after identities/hashes are recorded.

### Sync state

`local_draft -> queued_on_device -> sending -> server_received | failed | conflict`

Queued is not submitted.

## Existing export-integrity batches

Current export-integrity implementations may use states such as draft preview, approved, generated, opened in Microsoft Project, verified, rejected, failed, and superseded.

Those states remain useful for input authority and artifact provenance. Future candidate-schedule work should either extend them carefully or introduce a separate candidate-schedule run entity rather than overloading `verified` to mean that a planner accepted, adopted, or merged the recalculated schedule.

## Authority rules

- Field users and contractors do not approve Project input or candidate disposition.
- Supervisors validate execution truth.
- Planners may originate permitted Console inputs, approve exact Project inputs, review complete recalculated candidates, and choose candidate disposition by default.
- An approved input is bound to one exact project/snapshot/task/field/value/source/version/candidate/approval identity.
- A candidate schedule is bound to one immutable source schedule and one immutable approved-input manifest.
- A planner candidate decision is bound to one candidate hash and semantic delta.
- Adoption as next schedule is a separate audit fact.
- Merge/import into another existing schedule is a separate planner-controlled Project operation with its own destination-before and result-after provenance.

## Candidate review requirements

A candidate review should show:

- source schedule identity/hash;
- complete updated candidate schedule identity/hash;
- approved-input manifest/hash;
- Project version/build used for calculation;
- approved inputs and input origin;
- Project-calculated consequences;
- planner edits made in Microsoft Project, if any;
- unexplained changes;
- project finish movement;
- planner decision and notes.

## Provenance classification

Every material source-versus-candidate difference should be classified as:

- `approved_input`;
- `project_calculated_consequence`;
- `planner_project_edit`;
- `unexpected_difference`.

Unchanged values need not be stored as delta rows but remain traceable to the source hash.

## Direct-input restrictions

Without an explicit policy change, Shutdown Tracker must not directly author:

- summary-task actuals;
- arbitrary planned dates/durations;
- dependencies;
- constraints;
- calendars;
- baselines;
- WBS/outline structure;
- Project critical/slack values;
- resource levelling or schedule optimisation outputs.

Those values may change inside a Microsoft Project-calculated candidate and be shown to the planner.

## Adoption as next schedule

If the planner chooses to use the candidate as the next controlled schedule, record:

- accepted source identity/hash;
- candidate identity/hash;
- adopted schedule identity/hash where available;
- adopted by/at;
- Project version/build;
- any manual Project edits made after the original candidate calculation;
- lineage to the prior master.

Shutdown Tracker must not claim adoption merely because the candidate opened successfully.

## Merge/import into existing schedule

If the planner chooses to merge/import the candidate into another Project schedule, record:

- candidate identity/hash;
- destination schedule identity/hash before merge;
- Microsoft Project version/build;
- merge/import mode;
- warnings/conflicts and planner choices;
- merged result identity/hash;
- planner decision;
- merged by/at.

The first supported merge/import process must operate against a disposable/backed-up destination copy. Shutdown Tracker must not silently overwrite the only master copy.

## Immutability and corrections

- Source schedule files/snapshots are immutable.
- Input candidates and approval events are append-only.
- Approved-input manifests are sealed and immutable.
- Generated candidate schedules and deltas are immutable artifacts once produced.
- Project-saved/reviewed candidate variants receive new identities/hashes rather than replacing prior evidence.
- Rejected and superseded candidates remain visible in history.
- Adoption and merge/import records are append-only decisions.
- Corrections create new candidates/manifests/runs rather than editing prior evidence.

## Required user-facing wording

Before candidate calculation:

```text
Approved for updated candidate calculation. Current master schedule unchanged.
```

After candidate produced:

```text
Updated candidate schedule produced. Open in Microsoft Project and review calculated impacts before deciding how to use it.
```

After candidate acceptance:

```text
Candidate accepted for planner use. The master schedule has not changed yet.
```

After adoption as next schedule:

```text
Planner recorded this candidate as the next controlled schedule.
```

After merge/import:

```text
Planner recorded a Microsoft Project merge/import result. Review the recorded destination and result hashes for provenance.
```
