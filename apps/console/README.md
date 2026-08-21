# Master Console

Purpose: React and Vite application for shutdown control, planners, coordinators, supervisors, package owners, and managers.

Current status: scaffolded React/Vite shell with shared API client wiring, opt-in live import/export review data fetching, a static Task Progress Review visual shell, and a separate local Microsoft Project round-trip acceptance mode.

The console renders synthetic review state by default for:

- source-file validation status
- parsed snapshot review
- task lineage review
- export preview candidates
- import/export review API client operations
- task progress review and export approval workflow
- supervisor review queue
- planner progress review queue
- progress candidates in export preview
- Microsoft Project verification metadata
- structured blockers and handover summary examples

To fetch live review data from the API, configure:

```text
VITE_SHUTDOWN_TRACKER_API_BASE_URL=http://localhost:8080
VITE_SHUTDOWN_TRACKER_PROJECT_ID=<review-project-id>
VITE_SHUTDOWN_TRACKER_IMPORT_SNAPSHOT_ID=<optional-snapshot-id>
VITE_SHUTDOWN_TRACKER_EXPORT_BATCH_ID=<optional-export-batch-id>
```

When `VITE_SHUTDOWN_TRACKER_PROJECT_ID` is absent, the normal console stays in synthetic review mode and does not call the backend. When it is present, the console reads import snapshot summaries, the selected or latest snapshot detail, and the optional export preview batch.

## Local round-trip acceptance mode

Use the browser acceptance harness when manually checking the Project handoff. Enable it with:

```text
VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE=true
```

During local Vite development, `/api` and `/actuator` are proxied to `http://localhost:8080`, so `VITE_SHUTDOWN_TRACKER_API_BASE_URL` can normally be omitted. The API local profile enables the project-worker parse/export clients and the synthetic review-project bootstrap by default; run the API on port 8080, the project worker on port 8081, and local PostgreSQL before using the harness.

The browser flow can now:

1. create/reuse the guarded synthetic local review project;
2. choose an `.xml`, `.mspdi.xml`, or `.mpp` source file;
3. upload the source and create its import batch;
4. ask the project worker to parse imported task facts;
5. persist those task facts as a reviewable Project snapshot;
6. accept the parsed snapshot;
7. select an imported leaf task;
8. create an authoritative `percent_complete`, `actual_start`, or `actual_finish` input candidate;
9. record its exact candidate-bound planner approval;
10. create and approve a sealed export preview batch;
11. generate the worker-backed MSPDI/XML candidate;
12. download the generated candidate through the API with its recorded SHA-256 rechecked before delivery;
13. open the downloaded candidate manually in Microsoft Project;
14. record that it was opened; and
15. record the planner verification result.

The round-trip test deliberately expects Microsoft Project to recalculate. Project-calculated changes to planned dates, durations, summaries, work/assignments, timephased data, slack, criticality, or project finish are reviewable schedule consequences, not automatic direct-input integrity failures.

This acceptance importer currently persists task facts required for the test path. It does not yet claim final full Project import persistence for resources, assignments, calendars, custom-field definitions, or timephased data. The current export worker also remains the existing direct-input/diagnostic writer until the complete-source candidate implementation is finished.

The normal console is isolated from the acceptance harness: round-trip code and its global test-only stylesheet are dynamically loaded only when the mode flag is enabled.

The mode is development/acceptance tooling. It does not calculate the schedule in Shutdown Tracker, automate Microsoft Project, silently update the master `.mpp`, or adopt a candidate without planner control.

## Visual shell limitations

The current Task Progress Review surfaces are static/synthetic visual review surfaces. They should not be treated as production route structure or backend API contracts.

The initial cleanup pass:

- locks the console top-level IA to Today, Tasks, Problems, Evidence, Exports;
- treats Supervisor Review and Planner Review as Today/Exports sections rather than permanent navigation;
- treats Project Verification as part of Exports;
- reduces card/chip density and uses sanitised operational examples;
- keeps write-like production controls disabled until their APIs exist;
- keeps Project-boundary warnings visible.

Relevant product source docs:

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
