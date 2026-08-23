# Frontend Visual Review Scope

This document defines how current and future frontend visual-review work relates to the approved two-application product model.

## Current implementation boundary

The ordinary Console and Mobile App now represent the approved information architecture as static/synthetic visual shells. This proves placement and visual hierarchy only; it does not imply production authentication, project, assignment, task, Critical, mapping, offline, or write APIs.

The Console represents `Login -> Projects Home -> Project Console`, with Today, Tasks, Task Dashboard, Critical, Import / Export, and Project Settings. The Mobile App represents `Assigned Tasks -> Task Detail`. Their ordinary product data is synthetic and their write-like controls are disabled. Login and project/task navigation use non-persisted local React state for visual review only.

The Task Dashboard/Task Detail statically represent Can't Start, Start, Pause, Resume, and Finish, automatic event-time semantics, late-start/pause/resume/finish context, and an end-of-shift Tracker field progress observation. They do not persist execution events/timestamps or implement manual correction/backdating.

Console Critical statically represents a Tier 2 owner, reusable template, effective policy version, supported timing/trigger combinations, controlled required content, due/report/history state, and disabled Tier 1 configuration. Mobile presents the Tier 2 obligation only in task/work-pack context with known facts pre-populated and remaining judgement fields identified. This does not implement policy evaluation, reporting APIs, arbitrary schemas, or a second execution-state model.

The ordinary Console may fetch read-only snapshot list/detail and optional export-preview data when explicitly configured. Those GET-only reads are the sole production API wiring in the ordinary shell.

The guarded Microsoft Project round-trip acceptance workspace is verified in the repository and integrated beneath Console Import / Export. Its entry is enabled by:

```text
VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE=true
```

That workspace drives the PR #48 acceptance path while preserving its feature flag and backend contracts. It remains a review-only capability, not a production project, Task Dashboard, lifecycle, or ordinary import/export write workflow. Its dynamically loaded component stays mounted after entry so an in-memory acceptance session is not discarded while switching project sections.

The current visual shells do not implement:

- OIDC or production login/session handling;
- production Projects Home, project creation, or project switching APIs;
- production project creation/lifecycle;
- three-tier membership or direct-report relationships;
- Tracker task assignments;
- production task execution APIs or event-derived state;
- production system-timestamp capture or audited execution-time correction;
- production Task Dashboard writes;
- Tier 2 tracking-validation or Tier 1 review writes in the ordinary Console;
- production discussion, delay/problem, action, or evidence workflows;
- IndexedDB offline queue/background sync;
- production Critical reporting APIs or writes;
- Operational Mapping services/APIs or writes;
- automated Microsoft Project verification or Project write-back.

See [Implementation Status Map](implementation-status-map.md) for the evidence-based capability classification.

## Required status labels

Every future visual brief must use one of these labels:

| Label | Meaning |
| --- | --- |
| Verified in repository | Bounded runtime or guarded acceptance capability is present and supported by repository evidence |
| Read-only API-wired | Surface reads backend data but does not provide production writes |
| Static visual only | Synthetic/hard-coded UI for product review |
| Designed, not built | Approved product behaviour without an end-to-end runtime implementation |
| Explicitly excluded | Outside the product boundary |

Do not infer implementation from a visual shell, disabled control, enum, migration table, or document.

## Approved ordinary application targets

### Console target

```text
Login
Projects Home
  Create project
  Active projects
  Draft projects
  Closed projects
  Archived projects
  Search
Project Console
  Today
  Tasks
    Task Dashboard
  Critical
  Import / Export
  Project Settings
```

The Console is Tier 1 only. Tier 1 has whole-project operational authority. Filters, categories, and saved views change presentation, not authority.

### Mobile target

```text
Assigned Tasks
  Task Detail
```

The Mobile App is Tier 2/Tier 3 only and is limited to explicit assignments. It is a satellite assigned-work client, not a responsive Console.

There is no separate Mobile Today, Problems, Evidence, Sync, or Critical destination. Delay/problem capture, actions, evidence, discussion, and Critical reporting obligations appear inside the relevant assigned Task Detail. Sync is a compact visible transport/recovery state.

Ordinary Mobile execution uses system-timestamped Can't Start / Start / Pause / Resume / Finish actions. Can't Start remains Not Started. Unfinished end-of-shift work uses plain operational progress language. Routine reporting is not mandatory for every task; an assigned Tier 2 Critical obligation is a policy-bound snapshot over known execution truth.

## Task-centred placement

| Surface | Approved placement |
| --- | --- |
| Execution state/actions | Task Dashboard / assigned Task Detail |
| People and assignment history | Task Dashboard |
| Discussion | Task Dashboard |
| Delays / Problems | Task Dashboard |
| Actions | Task Dashboard |
| Evidence | Task Dashboard |
| History | Task Dashboard |
| Tier 2 tracking validation | Assigned Task Detail or Tier 1 task context; no mandatory separate application screen |
| Tier 1 Project-input review | Import / Export, linked back to the Task Dashboard |
| Project verification | Guarded review workspace beneath Console Import / Export |
| Critical reporting | Console Critical oversight; assigned task or summary-work-pack Task Detail on Mobile |
| Needs response | Today attention queue and task context; not a chat inbox |
| Announcements | Controlled Today banner |

## Visual-only current areas

Current source includes static/synthetic examples for Login, Projects Home, project switching, Today, the Tasks explorer, Task Dashboard records, five-action execution, end-of-shift field progress, versioned Critical policy/reporting, Project Settings, assigned mobile work, and compact sync/recovery state. These examples demonstrate the approved ordinary placement but not production workflow implementation.

The configured ordinary Console import/export reads remain **Read-only API-wired**. The guarded browser round-trip path remains a **Verified in repository** review workspace. Neither classification promotes the surrounding visual shell to a production client.

## Visual review copy

Use one global visual-shell statement:

```text
Visual review shell. Static/synthetic data. No production write workflow.
```

Keep high-risk handoff copy visible:

```text
Tier 1 approval authorises this exact input for an updated Project candidate. The current master schedule is unchanged.
MSPDI/XML candidate generated — master .mpp not updated.
Shutdown Tracker records verification metadata only.
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
- Today is a high-signal 24-hour project view for attention conditions and exceptions.
- Tasks provides browsing, filtering, saved views, and Task Dashboard entry.
- Critical is reporting configuration and oversight, not critical-path calculation.
- Import / Export uses tables/lists for source, lineage, input, candidate, and delta review.
- Project Settings contains membership, direct reports, mappings, time settings, and lifecycle controls.
- Use cards sparingly for attention summaries.
- Avoid horizontal overflow in the default desktop view.
- Put record detail and history in the Task Dashboard rather than top-level dashboard zones.
- Do not create an editable Gantt, dependency editor, or replacement scheduler.

## Mobile visual rules

- Assigned Tasks shows assigned work before diagnostics.
- Use a compact sync banner with an embedded recovery view.
- Each task card should show only:
  - task name;
  - useful mapped context;
  - current execution state;
  - progress where relevant;
  - one blocker/evidence indicator;
  - one sync indicator;
  - one primary action.
- Everything else belongs in Task Detail.
- Keep actions thumb-friendly and failure/retry states explicit.
- Do not place whole-project browsing, Project export mechanics, or Critical configuration in Mobile.

## Acceptance criteria for visual PRs

Revise a visual PR if it:

- uses the old Console or Mobile navigation;
- adds a permanent top-level Problems, Evidence, review, verification, chat, reports, or dashboard zone;
- adds a separate Mobile Today, Problems, Evidence, Sync, or Critical destination;
- asks ordinary Mobile users to enter execution dates/times or backdate an event;
- lets Can't Start establish In Progress;
- treats every Pause as an adverse delay or silently closes a linked problem on Resume;
- presents routine periodic reporting as mandatory for every task;
- presents Critical reporting as a second execution-state model or an arbitrary report/form builder;
- permits Mobile whole-project browsing;
- creates a generic card wall;
- separates operational records from their Task Dashboard without a clear linked workflow;
- hides queued/failed/server-received state;
- implies a disabled control is live;
- implies Project write-back;
- introduces scheduler-like editing;
- uses colour as the only state signal;
- increases assigned-task card density beyond the minimum useful information;
- infers authority from category, discipline, contractor, work group, area, WBS, Resource `Group`, saved view, or Critical membership.

Future production work must replace static data and disabled controls with separately reviewed authentication, authorization, project, assignment, task, Critical, mapping, and offline contracts. The browser round-trip workspace remains available for the pending real-human Microsoft Project gate through Console Import / Export.
