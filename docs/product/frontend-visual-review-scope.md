# Frontend Visual Review Scope

This document defines how frontend visual-review work relates to the approved two-application product model on `product/trial-foundation`.

## Current implementation boundary

The Master Console and Mobile App are separate React clients. Their approved product shells are present for deterministic visual review, but most operational data and every write-like product control remain static, synthetic, or disabled.

The Console can read configured import snapshot list/detail data through `apps/console/src/apiReviewClient.ts`. `apps/console/src/projectXmlPreview.ts` also provides standalone local browser inspection of valid Microsoft Project MSPDI/XML. Neither capability authenticates a user, activates a project, changes a snapshot, or updates a Microsoft Project file.

The active frontend contains no PR #48 RoundTripWorkspace and has no dependency on its candidate approval, sealed preview, complete-source generation, Project-open verification controls, or manual Microsoft Project acceptance gate. Main's older export-preview and minimal-writer code remains experimental backend compatibility only. The final export/round-trip workflow is intentionally deferred until after operational frontend trials.

The current visual shells do not implement:

- OIDC/login sessions or tier authorization;
- production Projects Home data, project creation, or project lifecycle writes;
- Tier membership or Tier 2-to-Tier 3 direct-report persistence;
- Tracker task assignments;
- task execution APIs, event storage, or event-derived task state;
- production Task Dashboard records or writes;
- discussion, delay/problem, action, or evidence persistence;
- IndexedDB offline queue/background replay;
- Critical configuration, obligation, submission, or history APIs;
- Operational Mapping APIs;
- complete production import mapping/reconciliation/activation;
- a final approved export, comparison, adoption, or Microsoft Project round-trip workflow.

See [Implementation Status Map](implementation-status-map.md) for the evidence-based classification.

## Required status labels

Every visual brief and surface must use one of these labels:

| Label | Meaning |
| --- | --- |
| Verified in repository | Bounded runtime or independently useful technical capability is present |
| Read-only API-wired | Surface reads backend data but does not provide production writes |
| Static visual only | Synthetic or hard-coded UI for product review |
| Designed, not built | Approved product behaviour without end-to-end runtime implementation |
| Explicitly excluded | Outside the active product boundary |

Do not infer implementation from a visual shell, disabled control, enum, migration table, compatibility service, or document.

## Approved application targets

### Master Console

```text
Login
Projects Home
  Create Project
  Active
  Draft
  Closed
  Archived
  Search
  Project switching
Project Console
  Today
  Tasks
    Task Dashboard
  Critical
  Import / Export
  Project Settings
```

The Console is Tier 1 only. Tier 1 has whole-project operational authority. Filters, categories, mappings, groups, and saved views change classification or presentation, not authority.

### Mobile App

```text
Assigned Tasks
  Task Detail
```

The Mobile App is Tier 2/Tier 3 only and is limited to explicit assignments. It is a satellite assigned-work client, not a responsive Console.

There is no separate Mobile Today, Problems, Evidence, Sync, Critical, Import / Export, or Project Settings destination. Discussion, delays/problems, actions, evidence, and contextual Critical obligations belong inside the relevant assigned Task Detail. Sync remains a compact transport/recovery state.

## Task-centred placement

| Surface | Approved placement |
| --- | --- |
| Can't Start / Start / Pause / Resume / Finish | Task Dashboard or assigned Task Detail |
| End-of-shift unfinished progress | Assigned Task Detail |
| People and assignment history | Task Dashboard |
| Discussion | Task Dashboard |
| Delays / Problems | Task Dashboard |
| Actions | Task Dashboard |
| Evidence | Task Dashboard |
| History | Task Dashboard |
| Tier 2 tracking responsibility | Assigned Task Detail and Tier 1 task context |
| Tier 1 Critical configuration and oversight | Console Critical |
| Tier 2 Critical reporting obligation | Assigned Task or Work Pack detail |
| Import source inspection and snapshot review | Import / Export -> Import |
| Export direction | Import / Export -> Export, labelled not finalised |
| Needs response | Today attention queue and task context; not a chat inbox |
| Announcements | Controlled Today banner |

## Current visual and wired areas

| Frontend area | Current label | Limit |
| --- | --- | --- |
| Login and Projects Home | Static visual only | Review-only transitions with synthetic projects; no identity or project API. |
| Today, Tasks, Task Dashboard | Static visual only | Approved structure and state semantics over synthetic task data. |
| Critical | Static visual only | Disabled per-item policy/template configuration and contextual reporting examples; no Critical API. |
| Project Settings | Static visual only | General, Users, Operational Mapping, Project History, and Lifecycle are review shells with disabled writes. |
| Mobile Assigned Tasks and Task Detail | Static visual only | Tier 2/Tier 3 examples and disabled execution, assignment, progress, and reporting controls. |
| Import snapshot list/detail | Read-only API-wired | GET-only ordinary Console wiring when an API project is explicitly configured. |
| Local MSPDI/XML inspection | Verified in repository | Browser-only XML namespace/content inspection; no `.mpp`, persistence, or activation. |
| Export | Static visual only | Direction is deliberately not finalised; experimental main compatibility code is not presented as product authority. |

## Execution visual rules

- Show exactly Can't Start, Start, Pause, Resume, and Finish for ordinary Mobile execution.
- State that action timestamps are system captured. Do not request ordinary manual start/finish dates or times.
- Can't Start leaves execution Not Started and captures reason, what must happen, and optional linked action/problem context.
- Ask for late-start cause/action context only when Start is late.
- Keep a Pause interval distinct from an adverse structured delay/problem while allowing an explicit link.
- Resume must not silently close a linked structured problem.
- Finish uses concise confirmation and requires evidence only when configured policy requires it.
- Ask unfinished end-of-shift work in plain operational language: `How much of the task is complete?`
- Keep execution state separate from schedule attention. A passed planned start can produce `Not Started` plus `Late to Start`; planned dates alone never create `In Progress`.

## Critical reporting visual rules

- Routine Critical reporting applies only to explicitly selected Critical items, not every task.
- Show a versioned per-item policy with Tier 2 reporting owner, timing/triggers, supported content, template/item override, next due, overdue state, latest report, condition, and history.
- Supported timing examples may include no routine reporting, request/ad hoc, interval, fixed time, shift, event/exception, and supported combinations.
- Use a controlled content catalogue and pre-populate known execution facts. Do not introduce a generic report/form builder or a second execution-state model.
- Tier 3 may see Critical context but does not configure it or own the formal Tier 2 obligation by default.
- Keep all Critical configuration/submission controls disabled until production APIs, authorization, audit, and offline behaviour exist.

## Import / Export visual rules

The ordinary structure is:

```text
Import / Export
  Current Schedule
  Import
  Export
  History
```

Import should lead with source selection, browser inspection, admission validation, parse summary, task/snapshot review, mapping validation, comparison/reconciliation, and activation as each capability becomes available. Clearly distinguish the verified local XML inspector, read-only snapshot GET wiring, and unimplemented write steps.

Export must say that the final product workflow is not finalised. Do not present candidate-bound approval, sealed previews, batch approval, a required browser acceptance harness, or a real-human Microsoft Project gate as settled product architecture. Do not imply that main's patch-shaped compatibility writer updates or represents the master Project schedule.

Use this current high-risk copy:

```text
Export design is not finalised. Existing compatibility code is experimental and does not update the master Microsoft Project schedule.
```

## General visual-review copy

Use one global visual-shell statement:

```text
Visual review shell. Static/synthetic data. No production write workflow.
```

Required offline copy:

```text
Saved locally.
Queued on this device. Not yet sent.
Could not send. Still saved on this device.
Server received.
Last synced at [time].
```

## Synthetic data rules

Synthetic data should be clearly non-operational to developers but realistic enough for visual review.

Avoid:

- `Synthetic Task A1`;
- `Synthetic Summary B`;
- `Sample Row 1`;
- `Demo User A`.

Prefer sanitized examples:

- `C2 Cyclone — remove access cover`;
- `D2 Stack — scaffold inspection`;
- `HV inlet — vacuum clean-out`;
- `Furnace bottom — install blanking plate`;
- `Permit isolation — await operations release`;
- `Crane lift — wait for lift plan sign-off`.

Synthetic metadata may keep fixture IDs internally.

## Console visual rules

- One job per screen.
- Today is a high-signal configurable 24-hour project view over task records.
- Tasks provides hierarchy, browsing, filtering, grouping, columns, saved views, and Task Dashboard entry.
- Critical is reporting configuration and oversight, not critical-path calculation.
- Import / Export separates verified import-review capability from deferred export direction.
- Project Settings contains General, Users, Operational Mapping, Project History, and Lifecycle.
- Use tables/lists for operational content and cards sparingly for attention summaries.
- Avoid horizontal overflow at normal desktop widths.
- Keep operational records in the Task Dashboard rather than top-level competing applications.
- Do not create an editable Gantt, dependency editor, or replacement scheduler.

## Mobile visual rules

- Assigned Tasks shows assigned work before diagnostics.
- Use a compact sync banner with embedded recovery detail, never a Sync destination.
- Each task card should show only task name, useful mapped context, execution state, progress where relevant, one attention/evidence indicator, one sync indicator, and one primary action.
- Everything else belongs in Task Detail.
- Keep actions thumb-friendly and failure/retry states explicit.
- Do not place whole-project browsing, Project export mechanics, or Critical configuration in Mobile.

## Acceptance criteria for visual PRs

Revise a visual PR if it:

- uses any Console navigation other than Today, Tasks, Critical, Import / Export, and Project Settings;
- adds a permanent top-level Problems, Evidence, Discussion, Actions, History, review, reports, or dashboard destination;
- adds a separate Mobile Today, Problems, Evidence, Sync, Critical, Import / Export, or Project Settings destination;
- permits Mobile whole-project browsing;
- requests ordinary Mobile users to enter execution dates/times;
- makes planned dates establish `In Progress`;
- makes routine Critical reporting mandatory for every task;
- introduces a generic form builder;
- creates a generic card wall;
- separates operational records from their Task Dashboard without a clear linked workflow;
- hides queued, failed, or server-received sync state;
- implies a disabled control is live;
- presents PR #48 or main's compatibility exporter as current product authority;
- implies Project write-back or a completed round trip;
- introduces scheduler-like editing;
- uses colour as the only state signal;
- infers authority from category, discipline, contractor, work group, area, WBS, Resource `Group`, saved view, or Critical membership.

The next product step is a deterministic frontend operational trial/simulation on this foundation. Production task-execution backend work requires a separate reviewed implementation PR.
