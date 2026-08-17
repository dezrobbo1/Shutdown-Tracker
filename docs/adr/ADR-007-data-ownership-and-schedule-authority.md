# ADR-007: Data Ownership and Schedule Authority

Status: Accepted

## Context

Shutdown Tracker must connect field execution truth and authorised planner input to Microsoft Project without becoming an independent scheduler and without making the product so restrictive that approved information can never produce a useful updated schedule.

The previous shorthand — “Shutdown Tracker must not move dates” — was ambiguous. It did not distinguish a date invented by Shutdown Tracker from a date recalculated by Microsoft Project after reviewed inputs are applied.

The intended product outcome is a complete updated Project candidate that a planner can review, reject, keep, adopt as the next schedule, or merge/import into another existing schedule.

## Decision

Adopt three explicit authority layers.

### 1. Execution/input authority — Shutdown Tracker

Shutdown Tracker may capture, enter, review, approve, and audit explicit execution/progress facts under the active handoff policy.

Inputs may come from:

- field execution and progress capture;
- supervisor-reviewed corrections;
- authorised planner entry in the Master Console; or
- another explicitly approved structured source.

Examples include task execution state, progress, actual start/finish claims, physical progress, blockers, evidence, and handover. Only facts allowed by the active handoff policy may be sent to candidate generation.

Planner Console entry does not remove provenance or review requirements. Every direct Project input remains attributable to an actor, source snapshot, task, old value, proposed value, policy, and approval state.

### 2. Calculation authority — Microsoft Project

Microsoft Project owns schedule calculation.

Shutdown Tracker may create a complete updated schedule candidate from the accepted source plus the approved-input manifest. When that candidate is opened/imported in Microsoft Project, Project may recalculate planned dates, durations, summary roll-ups, work, assignment values, timephased data, slack, criticality, and other dependent values.

Shutdown Tracker must not independently calculate or invent those consequences. It may read, store, compare, and display them as **Microsoft Project-calculated consequences**.

### 3. Candidate/adoption authority — Planner

The planner reviews the complete candidate schedule and source-versus-candidate delta.

The planner decides whether to:

- reject the candidate;
- retain it for further review;
- use the candidate as the next controlled schedule/master; or
- use Microsoft Project to merge/import the candidate into another existing schedule.

Shutdown Tracker must not automatically replace the accepted master schedule or silently perform a merge into a live master.

## Direct-input boundary

Without a separate product decision, Shutdown Tracker must not directly author:

- summary-task actuals;
- arbitrary planned dates or durations;
- dependencies/predecessors;
- constraints;
- calendars;
- baselines;
- WBS/outline structure;
- resource levelling or allocation changes;
- Project Critical/slack values;
- Project formula results.

These fields may legitimately change **inside a Project-calculated candidate**. That is not the same as Shutdown Tracker directly writing them.

A later product decision may expand planner-entered direct input authority, but it must remain explicit, reviewable, and separate from Project-calculated consequences.

## Candidate disposition and merge rules

- Candidate generation always produces a new artifact; it does not mutate the accepted source/master.
- `Accepted candidate` is not the same as `adopted as master`.
- `Merged/imported into existing` is a separate planner-controlled Project operation and must be recorded separately.
- The first supported merge/import workflow must operate against a disposable/backed-up destination copy, not silently against the only master copy.
- Merge/import evidence must record destination-before identity/hash, candidate identity/hash, Microsoft Project version/build, merge mode, warnings/conflicts, and result identity/hash.

## Consequences

- Imported schedule snapshots remain immutable source facts.
- Candidate schedules are complete updated Project artifacts with their own hashes and provenance.
- Planner-facing review may include a read-only schedule-impact view or Gantt-like comparison, provided it does not edit or calculate the schedule.
- A failed or rejected candidate must leave the accepted source/master unchanged.
- A planner may use a reviewed candidate as the next schedule or merge/import it into an existing Project schedule, but those are explicit planner-controlled outcomes.
- Any future Project automation must be explicit, planner-controlled, copy-based, auditable, and incapable of silent master overwrite.
