# Active Goal — PR #61 Browser Round-Trip Acceptance Harness

## Status

Active.

Pull request [#61](https://github.com/dezrobbo1/Shutdown-Tracker/pull/61) must remain draft until its backend dependency and Microsoft Project manual acceptance checks are complete.

Expected branch:

`frontend/round-trip-test-harness`

Base branch:

`backend/enforce-export-integrity`

## Outcome

Make the Microsoft Project round-trip practical to test from the Master Console instead of requiring repeated manual PowerShell/API orchestration.

The local acceptance path should be:

```text
choose Project XML/MSPDI or MPP
-> upload source
-> project worker parses imported task facts
-> API persists a reviewable snapshot
-> planner accepts snapshot
-> select leaf task and direct input
-> create exact candidate
-> approve exact candidate
-> create sealed preview
-> approve batch
-> generate MSPDI/XML candidate
-> download candidate from browser
-> open in Microsoft Project
-> Project recalculates
-> planner reviews result
-> record Project-open and verification metadata
```

## Authority model

- Shutdown Tracker owns execution truth and exact reviewed direct inputs.
- Microsoft Project owns schedule recalculation and may change dependent dates, durations, roll-ups, work/assignments, timephased data, slack, criticality, and project finish.
- The planner owns candidate review, adoption, rejection, or later merge/import decisions.

The current `percent_complete`, `actual_start`, and `actual_finish` allowlist is a direct-input boundary. It is not a post-Project schedule-difference allowlist.

## Scope

This PR may add:

- a local browser round-trip mode in the Master Console;
- guarded local review-project bootstrap access;
- source upload from the browser;
- a project-worker task-snapshot parse endpoint;
- API persistence of the parsed task snapshot;
- browser-driven candidate/approval/preview/generation lifecycle;
- guarded download of locally stored generated MSPDI/XML artifacts;
- Project-open and verification recording;
- local Vite API proxying;
- focused CI for this dependent PR.

## Deliberate limits

- The parsed snapshot persistence slice may persist task facts only; it is not yet the final full Project import model for resources, assignments, calendars, custom fields, or timephased data.
- The generated artifact path still uses the current worker implementation; this PR does not claim that the existing patch-shaped writer is the final complete-source candidate generator.
- Microsoft Project itself is still opened manually. COM/Interop automation remains a separate implementation decision.
- No master `.mpp` is silently overwritten or adopted.
- No Shutdown Tracker CPM, float, critical-path, levelling, or recovery engine is introduced.

## Success criteria

- A user can start from a local Project file without manually creating source-file/import-batch/snapshot records.
- The project worker, not the API, performs Project parsing.
- The imported snapshot can be accepted and its leaf tasks selected in the browser.
- Candidate creation, exact approval, preview, batch approval, and generation work through the existing hardened backend authority path.
- A generated local artifact can be downloaded through a hash-verified API endpoint rather than manually locating a `file:` URI.
- The UI explicitly expects Microsoft Project recalculation and does not classify legitimate Project-calculated consequences as unauthorized direct inputs.
- Frontend tests/build, Maven tests, and migration validation pass on the branch.
- PR #61 remains draft until the manual Microsoft Project round-trip is performed.

## Required validation

Run or obtain CI evidence for:

```text
mvn test
npm ci
npm test
npm run build
bash scripts/db/validate-migrations.sh
```

Also verify the browser workflow against local PostgreSQL, API, and project-worker services before claiming manual round-trip readiness.

## Safety constraints

- Preserve PR #48 export-integrity controls.
- Do not weaken exact candidate/approval binding, stale-data checks, batch sealing, provenance, or worker direct-input allowlists.
- Keep source files, generated candidate files, local databases, and operational data out of Git.
- Do not merge PR #48 or PR #61 without explicit instruction.
- Do not mark either draft ready without explicit instruction.
- Do not rewrite branch history or force-push.
