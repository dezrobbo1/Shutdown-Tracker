# Master Console

Purpose: React/Vite Tier 1 client for whole-project operational control.

## Current implementation boundary

The source represents the approved ordinary information architecture:

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

The Login transition, Projects Home/project switcher, Today, Tasks explorer, Task Dashboard, Critical, and Project Settings are **Static visual only**. They use sanitized synthetic data and local view state. OIDC, production project APIs, lifecycle persistence, task execution, assignment, Critical, mapping, and operational-record writes are not implemented. Write-like controls are disabled.

Problems, Discussion, Actions, Evidence, and History belong to the relevant Task Dashboard; they are not project-level navigation destinations. Execution state and schedule attention are shown separately. In particular, a passed planned start never creates `In Progress` without a Tracker Start/Resume event or accepted imported start/progress evidence.

The ordinary Import / Export surface is **Read-only API-wired** when a project ID is explicitly configured. It performs snapshot list/detail and optional export-preview GET requests only:

```text
VITE_SHUTDOWN_TRACKER_API_BASE_URL=http://localhost:8080
VITE_SHUTDOWN_TRACKER_PROJECT_ID=<review-project-id>
VITE_SHUTDOWN_TRACKER_IMPORT_SNAPSHOT_ID=<optional-snapshot-id>
VITE_SHUTDOWN_TRACKER_EXPORT_BATCH_ID=<optional-export-batch-id>
```

Without `VITE_SHUTDOWN_TRACKER_PROJECT_ID`, it stays in static review mode and makes no backend request.

## Microsoft Project round-trip review workspace

The guarded PR #48 acceptance capability is integrated beneath Console **Import / Export**. Enable its entry with:

```text
VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE=true
```

The component and stylesheet remain dynamically loaded only after the user enters Import / Export and opens the review workspace. Once opened, the component stays mounted while it is hidden so an in-memory acceptance session is not discarded when moving among sections of the same opened project.

Before a backend is connected, a Microsoft Project `.xml` or `.mspdi.xml` file can be parsed locally with `DOMParser`, validated as Project MSPDI, and inspected in a searchable schedule table. This browser inspection does not upload or mutate the source. `.mpp` cannot be inspected in the browser; complete-source candidate generation currently requires MSPDI/XML.

With PostgreSQL, the API, and the project worker available, the workspace preserves the controlled workflow:

```text
inspect Project XML/MSPDI
-> upload source and persist parsed snapshot
-> accept or reject the snapshot
-> select a leaf task and exact direct input
-> create the exact candidate and approval event
-> create a sealed preview and approve the batch
-> generate complete-source candidate XML
-> download and open in Microsoft Project
-> Microsoft Project recalculates
-> human Project review
-> record Project-open and verification metadata
-> separate reject / retain / adopt / merge disposition remains outside this workspace
```

The consolidated candidate action preserves the distinct backend candidate, approval, preview, batch approval, and generation transitions. The backend still enforces exact approval binding, freshness, sealed membership, policy, source hash, and worker integrity checks.

`Start clean test` creates a new isolated synthetic review project through `POST /api/review-project/new`; it does not erase append-only approval, export, or audit records. `Clear current review` clears browser-session state only.

The real human Microsoft Project round trip remains pending. Generating a candidate does not update the master `.mpp`, and recording verification metadata alone does not prove that external review succeeded.

During local Vite development, `/api` and `/actuator` proxy to `http://localhost:8080`. The API local profile and project worker must be running for the persisted path.

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
