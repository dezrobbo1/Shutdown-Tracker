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

The Login transition, Projects Home/project switcher, Today, Tasks explorer, Task Dashboard, Critical, and Project Settings use sanitized synthetic data and local React view state. OIDC, production project APIs, lifecycle persistence, task execution, assignment, Critical, mapping, and operational-record writes are not implemented. Write-like controls are disabled.

Problems, Discussion, Actions, Evidence, and History belong to the relevant Task Dashboard rather than project-level navigation.

## Task execution and Critical reporting

The Task Dashboard represents the approved Can't Start / Start / Pause / Resume / Finish action vocabulary and system-captured timestamp boundary. It does not persist events or provide ordinary manual correction/backdating.

Execution state and schedule attention are separate. A passed planned start never establishes `In Progress` without a Tracker Start/Resume event or accepted imported Actual Start/progress evidence.

The Critical shell represents selected leaf/work-pack items, Tier 2 ownership, reusable templates, effective policy versions, supported timing/trigger combinations, controlled required content, due state, condition, and history. Configuration controls are disabled. It does not implement a Critical API, arbitrary field schemas, or a second execution-state model.

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
- `docs/product/ux-anti-slop-rules.md`
- `docs/product/design-language-and-status-semantics.md`

## Local commands

```text
npm run dev
npm test
npm run build
```
