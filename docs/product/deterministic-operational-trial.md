# Deterministic Operational Trial

This document describes the frontend-only operational trial implemented for product review. It is subordinate to the approved [Product Flow and Software Map](product-flow-and-software-map.md), [User Tier and Assignment Model](user-tier-and-assignment-model.md), [Task Operational Model](task-operational-model.md), and [Critical Reporting Model](critical-reporting-model.md). It does not change those authorities or define a production contract.

## Purpose and boundary

The trial lets a human reviewer exercise the approved shutdown workflow across the separate Tier 1 Console and Tier 2/Tier 3 Mobile clients before production APIs or persistence are designed.

Every trial surface is labelled:

```text
Synthetic operational trial
Deterministic local state
No production persistence
```

The trial:

- uses one fixed fictional scenario and a shared pure TypeScript model;
- uses a simulated clock rather than the system wall clock;
- applies assignments, execution events, Critical policies, reports, actions, problems, and progress observations only to in-memory state;
- derives Today, assigned-work projections, task state, reporting obligations, and history from that state;
- gives the same result for the same starting state and action sequence; and
- restores the exact initial scenario on Reset.

The trial does not provide authentication, authorization enforcement, API writes, production persistence, offline replay, database records, a scheduling engine, CPM/critical-path calculation, or a final Microsoft Project export/round-trip workflow. It does not restore PR #48's candidate or acceptance workflow.

## Review-driven interaction safeguards

The first end-to-end Vercel review produced a narrow frontend refinement pass without changing the approved product model:

- Mobile renders assigned work before the collapsed simulation controls and guided checklist.
- A second `Can't Start` for the same task at the same simulated minute is rejected as an accidental repeat. A later, distinct blocked-before-start observation remains valid while execution is still Not Started.
- Re-submitting an identical active Tier 3 user/relationship assignment is rejected; changing the relationship or choosing another eligible direct report remains available.
- Creating or changing a Critical policy retains all generated obligation records but does not add one activity-history entry for every future scheduled occurrence. Due, requested, event-triggered, submitted, and corrected reporting activity remains visible.
- A Tracker field progress observation is labelled with its source and time. Non-zero field progress without valid imported start/progress evidence or a Tracker Start event does not establish In Progress.
- Console Task Dashboard section controls wrap without requiring horizontal scrolling, and selected sections expose current-page semantics.

These are deterministic trial protections and presentation refinements, not production validation, persistence, or concurrency controls.

## Activation

Trial mode is opt-in and is disabled unless the Vite flag has the exact value `true`:

```text
VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true
```

From the repository root, run the clients separately:

```text
VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true npm run dev --workspace @shutdown-tracker/console
VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true npm run dev --workspace @shutdown-tracker/mobile-pwa
```

Outside trial mode, the existing static review shells and bounded read-only Console import wiring retain their existing behaviour. Trial mode does not enable any backend write.

## Separate Tier 1 Project round-trip trial

The imported-schedule evidence workflow is independently opt-in:

```text
VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL=true
```

It does not change this document's fixed fictional scenario, shared Console/Mobile trial, or deterministic reset contract. It retains a selected Project XML source in browser memory, lets synthetic Tier 1 execution create proposed optional mappings, generates a separate source-preserving experimental candidate, and supports manual Microsoft Project recalculation plus local result comparison. It remains frontend-only and does not approve a final export contract or restore PR #48's approval lifecycle. See [Tier 1 Project Round-Trip Trial](tier1-project-roundtrip-trial.md).

## Optional linked Console and Mobile session

The trial can run independently in either client. For linked review, set the Console's Mobile trial URL:

```text
VITE_SHUTDOWN_TRACKER_MOBILE_TRIAL_URL=<mobile-trial-origin-and-url>
```

The Console opens the separate Mobile application with its Console origin in the `trialHostOrigin` query parameter. While that opened window remains connected:

- the Console owns the canonical in-memory trial state;
- Mobile sends typed trial actions to its opener;
- Console applies each action through the shared deterministic reducer and sends the resulting state back;
- both clients validate the expected window reference, exact origin, and versioned trial-message channel; and
- a Tier 1 assignment change or Mobile execution/reporting action is immediately reflected in the other projection.

This bridge is ephemeral review transport, not application persistence or a production API design. It uses an ephemeral linked-window session, correlated action acknowledgements, duplicate-request protection, and a real-time heartbeat. Tier 1-only Console actions are rejected at the Mobile bridge boundary; task execution and task-owned record mutations are also checked against the current synthetic Tier 2 tracking or Tier 3 field assignment in the shared reducer. If the Console closes, reloads, or stops acknowledging requests, Mobile retains its latest validated action locally, marks the bridge disconnected, and does not imply the change reached Console. It does not use backend writes, `localStorage`, IndexedDB, or background sync. Closing or reloading the host discards the host's generated state; Reset restores the fixed initial state. If the bridge is not configured, each client runs a standalone deterministic in-memory trial.

## Fixed synthetic scenario

The scenario is `shutdown-trial-v1` for the fictional `Calciner trial shutdown` at `Synthetic processing plant`. It contains:

- one shutdown-programme root;
- four summary work packs;
- sixteen executable leaf tasks;
- one Tier 1 review persona;
- two Tier 2 tracking personas;
- five Tier 3 direct-report personas;
- `WORKING_ON` and `FIELD_CONTROL` field assignments;
- completed, imported-progress, Not Started, active, paused, blocked-before-start, late-start, and shift-crossing examples;
- selected Project-critical leaf tasks and Critical Work Packs; and
- interval, fixed-time, shift, requested, event/exception, combined, and no-routine-reporting policies.

All names, identifiers, work packs, events, and values are fictional. The trial does not load external or customer Project schedules and does not commit real operational data.

## Simulation clock

The fixed initial time is 24 August 2026 at 06:00 in `Australia/Perth`. The bounded trial ends at the next 06:00 operational-day boundary. Shift boundaries are 18:00 and the next 06:00.

Available controls are:

- `+15 minutes`;
- `+1 hour`;
- `Next event`;
- `Next report due`;
- `Next shift boundary`; and
- `Reset trial`.

Time moves only forward in whole simulated minutes. Every generated execution event, assignment, problem, action, policy version, reporting obligation, report, correction, progress observation, and history entry uses the simulated time. Advancing time processes due reports, planned-finish exceptions, shift obligations, Today attention, and activity history deterministically.

## Personas and permitted trial actions

### Tier 1 Console

Tier 1 can review the whole synthetic project through Today, Tasks, Task Dashboard, Critical, Import / Export, and Project Settings. Trial interactions include:

- inspect derived execution state, schedule attention, reporting attention, problems, actions, and recent activity;
- open the Project-like task hierarchy and task-centred dashboard;
- assign or reassign Tier 2 tracking responsibility;
- select a Project-critical leaf task or summary-plus-descendants Critical Work Pack;
- choose the Tier 2 reporting owner, template, supported timing mechanisms and triggers, and controlled required content; and
- create an item-level policy override as a new effective policy version.

These changes exist only in local trial state and do not establish production authority enforcement or persistence.

### Tier 2 Mobile

The persona selector exposes only work explicitly assigned to the selected Tier 2 user for tracking. Tier 2 can:

- inspect assigned tasks and work packs;
- delegate field work to a direct-report Tier 3 user as `WORKING_ON` or `FIELD_CONTROL` while retaining tracking responsibility;
- perform allowed task execution actions on assigned work;
- review contextual Critical obligations;
- see known execution facts pre-populated from the shared task state;
- enter only the required judgement or forecast fields;
- submit an immutable Critical report; and
- create a correction that supersedes rather than overwrites the original report.

Tier 2 cannot browse unassigned project work.

### Tier 3 Mobile

The persona selector exposes only tasks explicitly delegated to the selected Tier 3 user. Tier 3 cannot assign work onward and does not own formal Tier 2 reporting obligations by default.

Tier 3 can exercise:

- `Can't Start`: record the simulated time, reason, what must happen, and optional linked problem/action while execution remains Not Started;
- `Start`: record the simulated time and establish In Progress, with late-start cause/action context required only after the planned start;
- `Pause`: record the simulated time and reason, distinguishing a normal pause from a linked adverse delay/problem;
- `Resume`: close the pause interval and explicitly leave a linked issue open or resolve it;
- `Finish`: confirm and record simulated completion;
- resolve a task-owned trial problem or complete a task-owned trial action when appropriate; and
- end-of-shift unfinished progress in plain operational language.

Ordinary Mobile execution does not request manual dates or times. End-of-shift input asks `How much of the task is complete?` and captures a percentage, what remains, any next-shift issue, and optional note/evidence. It does not expose Microsoft Project `% Work Complete` or `Physical % Complete` terminology.

## Critical reporting trial

Critical obligations are generated from the effective policy version for each selected Critical item. Supported mechanisms are:

- no routine reporting;
- ad hoc/requested;
- fixed interval;
- fixed times;
- shift-based;
- event/exception triggered; and
- supported combinations of those mechanisms.

Routine periodic reporting is not generated for every task. Ordinary task progress comes from execution events, end-of-shift observations, and explicitly requested updates. Critical reports are snapshots over that execution truth and do not create a second task-state model.

The supported content catalogue is limited to completion/progress, operational condition, current position/focus, main delay/constraint, action/recovery, next target, forecast completion, configured resources/labour, evidence requirement, and update text. There is no arbitrary field schema or generic form builder.

Known task facts are pre-populated and are not requested again from Tier 2. Obligations progress through upcoming, due, overdue, and submitted projections. Submitted reports remain immutable. A correction creates a new report that identifies the report it supersedes. Policy changes create a new effective version without rewriting earlier obligations or reports.

## Today, Task Dashboard, and event history

Today is derived from the shared trial state and the active 24-hour operational-day window. It keeps execution state separate from schedule attention and includes Not Started, In Progress, Paused, Completed, late starts, blocked/Can't Start work, running beyond planned finish, due/overdue Critical reports, active problems, due actions, and recent activity.

Passing a planned start never establishes In Progress. Only accepted imported actual/progress evidence or a Tracker Start/Resume event can establish execution.

The Task Dashboard derives Overview, Execution, People, Discussion, Delays / Problems, Actions, Evidence, History, and Project context from the same task and event history. Assignment, execution, problem/action, Critical, report, and progress events appear in the task and Today projections without a competing state model.

## Reset and deterministic replay

`Reset trial` restores:

- 24 August 2026 at 06:00;
- the original tasks and imported facts;
- the original Tier 2 and Tier 3 assignments;
- the original Critical items, templates, policies, obligations, and baseline report;
- the original baseline execution events, problems, actions, and history; and
- the initial deterministic ID sequence.

Reset removes every generated execution event, assignment change, policy version, obligation, report, correction, progress observation, problem, action, and history entry. Repeating the same sequence after Reset produces the same result.

Reset also returns the Console to Today with no selected task and returns Mobile to the default Tier 2 persona and Assigned Tasks list. This presentation reset is local review behaviour rather than a production navigation contract.

## Guided review sequence

The guided checklist is optional and never advances automatically. Free interaction remains available throughout.

| Simulated time | Reviewer action | Expected observation |
| --- | --- | --- |
| 06:00 | Begin the operational day. | Today shows the fixed 24-hour window and baseline work. |
| 06:15 | Advance past the scaffold-access planned start without executing it. | The task remains Not Started and becomes Late to Start. |
| 06:20 | As Riley Jones, use Can't Start for access/scaffold release. | Execution stays Not Started and a blocked-before-start problem is linked. |
| 06:45 | Review Today as Tier 1. | The issue, due action, late start, and reporting attention are visible. |
| 07:00 | Resolve the access issue, then Start with late-start context. | A system-timestamped Start establishes In Progress. |
| 08:00 | Open the Tier 2 Critical obligation and submit its required judgement fields. | The report is immutable and the obligation becomes Submitted. |
| 09:15 | Pause for a material issue and classify it as an adverse delay. | Execution becomes Paused while the pause, linked problem, and any recovery action remain distinct records. |
| 10:00 | Review Critical from the Console. | The material issue and due/overdue reporting state are visible. |
| 10:30 | Resume while leaving the linked material issue open. | Execution returns to In Progress without silently resolving the problem. |
| 12:00 | Resolve the remaining material problem. | Problem history records resolution separately from Resume. |
| 14:00 | Finish the scaffold-access task. | A system-recorded Finish establishes Completed. |
| 18:00 | Open unfinished assigned work and record end-of-shift progress. | The field observation records completion, remaining work, and any next-shift issue. |

## Product-review questions

The trial provides evidence for a human reviewer to answer these questions; it does not answer them in code:

1. Does Today show enough information?
2. Is the Tier 1 -> Tier 2 -> Tier 3 assignment model intuitive?
3. Is Can't Start distinct enough from Pause?
4. Is late-start capture too intrusive or appropriate?
5. Does Pause collect enough delay information?
6. Is Resume resolution handling understandable?
7. Is Finish simple enough?
8. Is end-of-shift progress useful without Project terminology?
9. Does Tier 2 receive enough context without too much project data?
10. Are Critical reporting policies flexible enough?
11. Are Critical reports duplicating information already captured?
12. Is the Task Dashboard too dense or too sparse?
13. Which execution facts appear useful for eventual Project export?
14. Which Project export assumptions should remain deferred?

Answers should be recorded as product-trial feedback. Any production data model, API, persistence, authorization, offline, or Project export decision requires a separate reviewed implementation or authority change.
