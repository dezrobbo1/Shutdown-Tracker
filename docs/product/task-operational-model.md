# Task Operational Model

This document is primary product authority for the central task record, assignments, execution state, task-owned operational records, and summary-task work-pack views.

## One operational centre per task

Each imported task has one central Shutdown Tracker operational record presented as a Task Dashboard in the Console and a permission-limited Task Detail in the Mobile App.

The Task Dashboard contains:

- **Overview** — imported identity, current projection, attention conditions, and schedule context;
- **Execution** — current state, progress method, audited events, and permitted controls;
- **People** — current Tier 2 tracking responsibility, Tier 3 assignments, and assignment history;
- **Discussion** — contextual task discussion;
- **Delays / Problems** — structured constraints, delay facts, blockers, and resolution state;
- **Actions** — assigned follow-up with owner, due state, and close-out;
- **Evidence** — controlled photo/file metadata and review state;
- **History** — imported provenance, assignments, events, corrections, supersessions, and audit trail;
- **Project/import/export context** — source snapshot, lineage, approved-input, candidate, and verification context where relevant.

Today, Tasks, Critical, and Import / Export may surface or filter a task, but they do not create separate copies of its operational records.

## Assignment meaning

- A Tier 2 task assignment means **tracking responsibility**.
- A Tier 3 task assignment means either `WORKING_ON` or `FIELD_CONTROL`.
- Tier 2 retains tracking responsibility when the task is assigned onward to Tier 3.
- Tier 2 and Tier 3 access is established by saved assignment records, not schedule categories.

The complete authority contract is [User Tier and Assignment Model](user-tier-and-assignment-model.md).

## Initial state from an accepted Project snapshot

When an accepted Microsoft Project snapshot is activated, derive the initial operational projection in this order. Completed is evaluated first and takes precedence over In Progress.

### Completed

A task is **Completed** when:

- imported Actual Finish exists; or
- the configured imported progress measure indicates complete.

### In Progress

A task is **In Progress** when it is not complete and:

- imported Actual Start exists; or
- the configured imported progress measure is greater than zero.

### Not Started

A task is **Not Started** when:

- there is no imported evidence of start;
- there is no Shutdown Tracker Start or Resume event establishing active execution; and
- the task is not complete.

The accepted Project snapshot is the source of this initial imported state. Its state-source provenance must be visible as **Imported from Microsoft Project snapshot**.

## State after Tracker execution begins

After Shutdown Tracker execution begins, the current operational projection is driven by valid audited Tracker events such as:

- Start;
- Pause;
- Resume;
- Block;
- Complete;
- Correction;
- Reversal.

The projection must retain visible provenance as **Established by Shutdown Tracker event** and identify the governing event/history.

Only a valid Start or Resume event can establish Tracker-originated In Progress. Pause, Block, Complete, Correction, and Reversal change the projection only through their valid event transitions; none may infer a start from planned dates.

Corrections and reversals preserve the earlier event; they do not erase it. Re-import must not silently overwrite active Tracker execution history or rebind it to a different task. A new snapshot requires lineage and conflict review where imported facts differ from the active Tracker projection.

## Planned dates do not create execution state

A task does not become In Progress merely because its planned start has passed or because it lies inside the Today period.

```text
planned start passed
+ no Tracker Start
+ no imported Actual Start
+ zero imported progress
= Not Started
+ Late to Start
```

Schedule variance and execution state are separate dimensions:

- **Late to Start** is an attention condition.
- Running beyond planned finish is an attention condition.
- Neither condition establishes In Progress.

Today is a high-signal 24-hour project view. Inclusion in Today changes neither task authority nor execution state.

## Summary tasks and work packs

Summary tasks use the same Task Dashboard as aggregate work-pack views. Their Overview, People, Discussion, Delays / Problems, Actions, Evidence, History, and Project context may summarize or link descendant activity.

Start, Pause, Resume, Block, and Complete normally apply to executable leaf tasks. Summary progress and schedule roll-ups remain Microsoft Project-calculated context unless an explicit future product decision says otherwise.

## Discussion is contextual only

A comment is contextual discussion. It is not:

- progress;
- a blocker or delay;
- an action;
- evidence;
- completion.

Important information must be promoted or linked to the correct structured record. Promotion preserves the source comment and the relationship to the resulting record.

## Microsoft Project boundary

Tracker execution events do not map one-to-one to Microsoft Project fields automatically. A permitted Project-bound value becomes an exact candidate only through the active handoff policy, provenance checks, review, exact approval binding, sealed preview, and candidate-generation controls.

Microsoft Project remains schedule calculation authority. Shutdown Tracker does not infer state from calculated dates, calculate CPM, or silently update the accepted source/master.
