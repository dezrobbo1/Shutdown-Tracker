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
- **Project/import/export context** — source snapshot, lineage, import history, and explicitly labelled experimental export context where relevant.

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

## Tracker execution flow and timestamps

The ordinary Mobile execution flow is:

```text
Can't Start / Start / Pause / Resume / Finish
```

Each action captures its event time automatically when the user confirms it. Tier 2 and Tier 3 users do not normally type an Actual Start, Actual Finish, execution date, or execution time. Manual correction or backdating is a separate future audited correction workflow with appropriate authority; it is not part of ordinary Mobile execution and is not implemented by the current visual shell.

After Shutdown Tracker execution begins, the current projection is driven by valid audited Tracker events:

- **Can't Start** records a blocked-before-start observation but leaves execution **Not Started**;
- **Start** establishes **In Progress**;
- **Pause** establishes **Paused** and opens the pause/delay reason workflow;
- **Resume** closes the active pause interval and establishes **In Progress**; and
- **Finish** records Tracker completion and establishes **Completed**.

Correction and reversal events may change the current projection through a separately authorised workflow. The projection must retain visible provenance as **Established by Shutdown Tracker event** and identify the governing event and history.

Only a valid Start or Resume event can establish Tracker-originated In Progress. No other action may infer a start from planned dates. A blocked or delayed condition is structured operational context, not another way to establish In Progress. A blocked-before-start condition coexists with Not Started; an adverse stop after work begins is represented by the Pause interval plus its linked delay/problem context. A retained technical `Block` state or event name is compatibility vocabulary, not an additional ordinary Mobile action.

Corrections and reversals preserve the earlier event; they do not erase it. Re-import must not silently overwrite active Tracker execution history or rebind it to a different task. A new snapshot requires lineage and conflict review where imported facts differ from the active Tracker projection.

### Can't Start

When assigned work cannot begin, **Can't Start** captures the current timestamp and asks for:

- a structured reason;
- what must happen before work can start;
- an action/owner where that workflow is supported; and
- a linked structured delay/problem where appropriate.

The task remains Not Started. It may also carry **Late to Start** and **Delayed / blocked before start** attention or operational conditions. Can't Start never creates an Actual Start or In Progress state.

### Start and late-start context

Start captures the current timestamp and establishes Tracker In Progress. It does not ask the Mobile user to enter an Actual Start.

If the captured Start is later than the accepted planned start, the contextual workflow asks what caused the late start, whether anything still needs action, and for an optional note/evidence where appropriate. An on-time Start does not require a late-start reason unless a later project policy explicitly requires one.

### Pause and adverse delay

Pause captures the current timestamp, establishes Paused, and automatically opens the pause/delay reason workflow. It captures:

- the pause reason;
- whether the pause represents an adverse task delay;
- what must happen before or while work resumes;
- a linked action where appropriate; and
- an optional note/evidence.

A pause interval and a structured adverse delay/problem are different records that may be linked. A planned break or shift change may be a Pause without an adverse-delay classification. The product must not classify every Pause as a schedule delay.

### Resume and open problems

Resume captures the current timestamp, closes the active pause interval, and returns execution to In Progress. If the pause links to an open structured delay/problem, the user must record whether the underlying issue is resolved or work has resumed while it remains open. Resume never silently closes a structured problem.

### Finish

Finish uses a concise confirmation, captures the current timestamp, and records Tracker completion. It does not ask the Mobile user to enter an Actual Finish. Evidence is required only where the configured task/project policy requires it.

## Unfinished work at end of shift

An assigned task that remains unfinished at end of shift supports a short field progress observation beginning with:

> How much of the task is complete?

Capture:

- completion percentage;
- what remains;
- any issue affecting the next shift; and
- optional note/evidence.

This is a **Tracker field progress observation**. Ordinary field users are not shown Microsoft Project-specific `% Work Complete` or `Physical % Complete` terminology. Any later interpretation as a Project-bound value requires the separately approved export policy that follows operational trials.

## Ordinary progress and Critical reporting

Ordinary task progress comes from execution events, the end-of-shift unfinished-work observation, and an explicit update when operationally requested. Routine periodic reporting is not mandatory for every task.

During-shift recurring or exception reporting is primarily configured for selected Project-critical tasks and assigned Critical Work Packs. A Critical report is a policy-bound snapshot over the underlying task execution truth. It may reuse known task facts, but it does not create a second independent execution-state model. See [Critical Reporting Model](critical-reporting-model.md).

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

Can't Start, Start, Pause, Resume, and Finish normally apply to executable leaf tasks. Summary progress and schedule roll-ups remain Microsoft Project-calculated context unless an explicit future product decision says otherwise.

## Discussion is contextual only

A comment is contextual discussion. It is not:

- progress;
- a blocker or delay;
- an action;
- evidence;
- completion.

Important information must be promoted or linked to the correct structured record. Promotion preserves the source comment and the relationship to the resulting record.

## Microsoft Project boundary

Tracker execution events and field progress observations do not map one-to-one to Microsoft Project fields automatically. The final Project-bound field, review, candidate, adoption, and re-import policy is deferred under [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md).

Microsoft Project remains schedule calculation authority. Shutdown Tracker does not infer state from planned dates, calculate CPM, or silently update the accepted source/master.
