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

Outside the explicitly flagged Tier 1 Project round-trip trial, the Login transition, Projects Home/project switcher, Today, Tasks explorer, Task Dashboard, Critical, and Project Settings use sanitized synthetic data and local React view state. OIDC, production project APIs, lifecycle persistence, task execution, assignment, Critical, mapping, and operational-record writes are not implemented. Write-like controls remain disabled.

Problems, Discussion, Actions, Evidence, and History belong to the relevant Task Dashboard rather than project-level navigation.

## Tier 1 Project round-trip trial

Enable the browser-local evidence trial with:

```text
VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL=true
```

Import / Export can then retain the original UTF-8 bytes and losslessly decoded text of a Microsoft Project XML/MSPDI source in memory, adapt its hierarchy into a temporary Tier 1 schedule, capture local Can't Start / Start / Pause / Resume / Finish and progress facts, and offer reviewed optional mappings to Actual Start, Actual Finish, `% Complete`, or `Physical % Complete`. Invalid or non-UTF-8 input fails closed, and no mapping is included by default.

The source-preserving browser patcher creates a separate complete-source candidate from only the selected fields, with identity/source-value checks and source/candidate hashes. The reviewer downloads it, opens/recalculates it manually in Microsoft Project, exports a new result XML, and re-imports that result for conservative local comparison and an in-memory disposition. Reset retains the immutable source and removes generated session state; discard or reload disposes of the complete browser-memory trial.

This is an experimental product trial, not PR #48's approval workflow or a final export contract. It has no backend/API persistence, approval lifecycle, native `.mpp`, automatic Project operation, CPM, or Mobile redesign. Ordinary Export remains not finalised outside this flag. See [Tier 1 Project Round-Trip Trial](../../docs/product/tier1-project-roundtrip-trial.md).

## Task execution and Critical reporting

The ordinary static Task Dashboard represents the approved Can't Start / Start / Pause / Resume / Finish action vocabulary and system-captured timestamp boundary without enabling writes. In the round-trip trial, an imported executable leaf derives those events from browser-memory state. It does not persist them or provide ordinary manual correction/backdating.

Execution state and schedule attention are separate. A passed planned start never establishes `In Progress` without a Tracker Start/Resume event or accepted imported Actual Start/progress evidence.

The Critical shell statically represents selected leaf/work-pack items, Tier 2 ownership, reusable templates, effective policy versions, supported timing/trigger combinations, controlled required content, due state, condition, and history. Its configuration controls are disabled. It does not implement a Critical API, arbitrary field schemas, or a second execution-state model.

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
- `docs/product/tier1-project-roundtrip-trial.md`
- `docs/product/ux-anti-slop-rules.md`
- `docs/product/design-language-and-status-semantics.md`

## Local commands

```text
npm run dev
npm test
npm run build
```

From the repository root, the Tier 1 Project round-trip trial can be started with:

```text
VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL=true npm run dev --workspace @shutdown-tracker/console
```
