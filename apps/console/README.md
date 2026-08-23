# Master Console

Purpose: React/Vite Tier 1 Master Console for whole-project operational control.

Current status: scaffolded React/Vite shell with read-only API wiring for configured import/export review data, a static Task Progress Review visual shell, and a separate guarded Microsoft Project round-trip acceptance workspace.

The ordinary Console renders synthetic review state by default for source validation, imported snapshots, export preview, tracking/input review, Project verification, blockers, and handover examples. It does not yet implement the approved ordinary shell.

Approved ordinary shell target:

```text
Login
Projects Home
Today
Tasks
Task Dashboard
Critical
Import / Export
Project Settings
```

Problems, Discussion, Actions, Evidence, and History belong inside the relevant Task Dashboard. Console access is Tier 1 only.

To fetch live review data from the API in the normal console, configure:

```text
VITE_SHUTDOWN_TRACKER_API_BASE_URL=http://localhost:8080
VITE_SHUTDOWN_TRACKER_PROJECT_ID=<review-project-id>
VITE_SHUTDOWN_TRACKER_IMPORT_SNAPSHOT_ID=<optional-snapshot-id>
VITE_SHUTDOWN_TRACKER_EXPORT_BATCH_ID=<optional-export-batch-id>
```

When `VITE_SHUTDOWN_TRACKER_PROJECT_ID` is absent, the normal console stays in synthetic review mode and does not call the backend.

## Microsoft Project round-trip acceptance workspace

Enable the acceptance workspace with:

```text
VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE=true
```

The workspace is intentionally useful before a backend is connected. A Microsoft Project `.xml` or `.mspdi.xml` file is parsed locally in the browser with `DOMParser`, validated as Project MSPDI by its root namespace, and shown as a searchable schedule table with WBS, task hierarchy, UID/ID, planned dates, duration, percent complete and actual dates. This browser inspection does not upload or mutate the source file.

MPP files cannot be inspected in the browser. They may still be sent to the project worker for import review when the backend is connected, but complete-source candidate generation currently requires Microsoft Project XML.

### Clean test state

The workspace has a `Start clean test` action. When the review backend is reachable it creates a new isolated synthetic review project through:

```text
POST /api/review-project/new
```

This is the acceptance-test reset mechanism. It does **not** delete previous export, approval, or audit history because current policy records are deliberately append-only. The new project gives the tester an empty active data scope while preserving old test evidence.

`Clear current review` clears the current browser file, preview, snapshot, candidate and activity state without changing saved connection settings.

### Connected round-trip flow

With PostgreSQL, the API and project worker available, the workspace can drive:

```text
choose and review Project XML
-> import source into a fresh/reused synthetic test project
-> project worker parses imported task facts
-> API persists a reviewable snapshot
-> Tier 1 reviews and accepts/rejects the snapshot
-> select a leaf task and direct input
-> one primary UI action creates the exact candidate, records approval,
   seals the preview, approves the batch and generates the candidate
-> download complete-source candidate XML
-> open in Microsoft Project
-> Project recalculates
-> Tier 1 schedule owner reviews the result
-> record Project-open and verification metadata
```

The consolidated candidate action removes repetitive acceptance-test clicks; the backend still performs the exact candidate/approval binding, freshness, sealing, policy, source-hash and worker checks at each stage.

During local Vite development, `/api` and `/actuator` are proxied to `http://localhost:8080`, so `VITE_SHUTDOWN_TRACKER_API_BASE_URL` can normally be omitted. The API local profile enables project-worker parse/export clients and the synthetic review-project bootstrap by default. Run the API on port 8080, the project worker on port 8081, and local PostgreSQL before using the persisted handoff path.

The round-trip test deliberately expects Microsoft Project to recalculate. Project-calculated changes to planned dates, durations, summaries, work/assignments, timephased data, slack, criticality, or project finish are reviewable schedule consequences, not automatic direct-input integrity failures.

The acceptance importer currently persists the task facts required by this path. It does not yet claim final full Project import persistence for resources, assignments, calendars, custom-field definitions, or timephased data.

The normal console remains isolated from the acceptance workspace: the round-trip component and its stylesheet are dynamically loaded only when the mode flag is enabled.

## Visual shell limitations

The current Task Progress Review surfaces outside the acceptance workspace are static/synthetic visual review surfaces. They are not the approved production route structure or backend API contracts.

Relevant product source docs:

- `docs/product/product-flow-and-software-map.md`
- `docs/product/user-tier-and-assignment-model.md`
- `docs/product/task-operational-model.md`
- `docs/product/project-lifecycle-and-import-export.md`
- `docs/product/implementation-status-map.md`
- `docs/product/frontend-visual-review-scope.md`
- `docs/product/ux-anti-slop-rules.md`
- `docs/product/design-language-and-status-semantics.md`
- `docs/product/task-progress-review-export-approval.md`
- `docs/product/project-candidate-schedule-handoff.md`

## Local commands

```text
npm run dev
npm test
npm run build
```
