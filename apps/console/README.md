# Master Console

Purpose: React/Vite Tier 1 client for whole-project operational control and product-trial review.

## Current information architecture

```text
Login
Projects Home
Project Console
  Today
  Tasks
    Task Dashboard
  Critical
  Import / Export
  Project Settings
```

Outside trial mode, the Login transition, Projects Home/project switcher, Today, Tasks explorer, Task Dashboard, Critical, and Project Settings use sanitized synthetic data and local React view state. OIDC, production project APIs, lifecycle persistence, task execution, assignment, Critical, mapping, and operational-record writes are not implemented. Write-like controls remain disabled outside the trial.

Problems, Discussion, Actions, Evidence, and History belong to the relevant Task Dashboard rather than project-level navigation.

## Deterministic operational trial

Set the flag to the exact value `true` to enable the frontend-only trial:

```text
VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true
```

Trial mode is labelled `Synthetic operational trial`, `Deterministic local state`, and `No production persistence`. It uses the shared `@shutdown-tracker/trial-model` scenario and reducer rather than production APIs or browser persistence.

The Console trial provides:

- the fixed simulated shutdown clock with `+15 minutes`, `+1 hour`, next event, next report due, next shift boundary, and deterministic Reset controls;
- Today, Tasks, Task Dashboard, Critical, and activity-history projections derived from one trial state;
- local Tier 1 reassignment of Tier 2 tracking responsibility;
- local selection/configuration of Project-critical leaf items and summary-plus-descendants Critical Work Packs;
- Tier 2 reporting-owner, template, supported timing/trigger, controlled-content, and policy-version configuration; and
- an optional guided checklist that does not advance time automatically or prevent free interaction.

Review refinements keep the Task Dashboard section controls wrapped at normal desktop widths, reduce future-obligation activity noise without removing obligation records, label field-observation progress separately from execution state, and return Reset to Today with no task selected.

Every generated assignment, execution fact, problem/action, Critical policy, obligation, report, correction, and history entry is synthetic and discarded on Reset or reload. None is sent to the production API.

For an optional linked review session, configure:

```text
VITE_SHUTDOWN_TRACKER_MOBILE_TRIAL_URL=<mobile-trial-origin-and-url>
```

The Console opens the separate Mobile application and remains the canonical in-memory host while the windows are linked. The bridge validates the expected window, exact origin, versioned message channel, ephemeral session, and correlated requests. Console action results are acknowledged and duplicate requests are not reapplied; a real-time heartbeat lets Mobile leave connected mode when a reload or closed host stops responding. Mobile bridge messages cannot invoke Tier 1-only Console actions, and the shared trial reducer enforces current task-assignment authority for execution and task-owned record updates. It uses no backend write, `localStorage`, IndexedDB, or production transport contract. Without that URL, Console and Mobile run independent deterministic local trials.

See [Deterministic Operational Trial](../../docs/product/deterministic-operational-trial.md) for the fixed scenario, personas, guided sequence, reset boundary, and product-review questions.

## Task execution and Critical reporting

The Task Dashboard represents the approved Can't Start / Start / Pause / Resume / Finish action vocabulary and system-captured timestamp boundary. Trial mode derives those events from deterministic in-memory state. It does not persist them or provide ordinary manual correction/backdating.

Execution state and schedule attention are separate. A passed planned start never establishes `In Progress` without a Tracker Start/Resume event or accepted imported Actual Start/progress evidence.

The Critical shell represents selected leaf/work-pack items, Tier 2 ownership, reusable templates, effective policy versions, supported timing/trigger combinations, controlled required content, due state, condition, and history. Configuration is locally interactive only in trial mode and creates another in-memory policy version. It does not implement a Critical API, arbitrary field schemas, or a second execution-state model.

## Import review

Import / Export includes a functional browser-only Project XML/MSPDI inspector. It:

- checks for XML content with the Microsoft Project MSPDI namespace;
- reads project identity and status date where supplied;
- counts summary and leaf tasks;
- presents searchable task, WBS, UID/ID, planned date, and imported progress context;
- keeps the selected source in the browser and does not upload or mutate it.

This is lightweight technical inspection, not complete semantic validation or production import acceptance. Native `.mpp` cannot be inspected in the browser.

The Console may also perform configured import snapshot list/detail GETs:

```text
VITE_SHUTDOWN_TRACKER_API_BASE_URL=http://localhost:8080
VITE_SHUTDOWN_TRACKER_PROJECT_ID=<review-project-id>
VITE_SHUTDOWN_TRACKER_IMPORT_SNAPSHOT_ID=<optional-snapshot-id>
```

Without `VITE_SHUTDOWN_TRACKER_PROJECT_ID`, no backend request is made. Persistence, Operational Mapping validation, comparison/reconciliation, activation, and production project switching remain disabled or unimplemented.

## Export boundary

The final Microsoft Project export and round-trip contract is intentionally deferred until after operational trials validate execution, progress, assignments, Today, Task Dashboard behaviour, and Critical reporting.

Earlier candidate, approval, sealed-preview, generation, Project-open, and verification work remains technical research in repository history or the superseded workstream. It is not exposed as the required workflow in this product foundation.

## Product authority

- `docs/product/product-flow-and-software-map.md`
- `docs/product/user-tier-and-assignment-model.md`
- `docs/product/task-operational-model.md`
- `docs/product/critical-reporting-model.md`
- `docs/product/project-lifecycle-and-import-export.md`
- `docs/product/implementation-status-map.md`
- `docs/product/frontend-visual-review-scope.md`
- `docs/product/deterministic-operational-trial.md`
- `docs/product/ux-anti-slop-rules.md`
- `docs/product/design-language-and-status-semantics.md`

## Local commands

```text
npm run dev
npm test
npm run build
```

From the repository root, trial mode can be started with:

```text
VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true npm run dev --workspace @shutdown-tracker/console
```
