# Shutdown Tracker

Shutdown Tracker is being rebuilt through small, usable browser-local slices around real Microsoft Project schedules.

The repository was deliberately reset on 27 August 2026 after the previous active tree became dominated by backend, database, approval, simulation and governance infrastructure before the core execution-to-Project workflow had been proven. That history remains available in Git and on `archive/pre-roundtrip-lab-reset-2026-08-27`.

The reset lab has now produced useful native evidence. Current `main` includes the Microsoft Project-verified `assigned-completion-native-v0` profile for a deliberately bounded assigned-task completion shape. Partial progress, off-plan actuals, multiple assignments and broader Project transaction shapes are still unproven.

That does **not** mean Shutdown Tracker must wait for every Microsoft Project semantic before product work continues.

## Current milestone — Local Execution Workspace v0

Build the smallest useful local shutdown execution workspace over an imported MSPDI/XML schedule.

The milestone is complete when a user can:

1. import a complete Microsoft Project XML schedule locally in the browser;
2. browse its hierarchy and executable leaf tasks;
3. select a task and record Tracker-owned execution intent/observations;
4. see Tracker state separately from imported Project state;
5. generate Project XML only for transaction shapes that are already native-evidence-supported;
6. leave partial or unsupported Project mappings as local/intent-only state rather than inventing XML semantics;
7. reset the local scenario; and
8. export the current Tracker workspace/evidence state as JSON.

A Microsoft Project result comparison remains useful for supported exports, but it is not the product itself and must not become the only workstream.

## Authority boundary

Shutdown Tracker and Microsoft Project have different responsibilities:

- **Shutdown Tracker owns execution truth and local operational observations.** It may record Start, Pause, Resume, Finish and partial observations even when no Project write-back mapping exists yet.
- **Microsoft Project owns schedule calculation and Project-native serialization.**
- **Project write-back is fail-closed.** Only native-evidence-supported transaction shapes may be written to Project XML.
- **Unsupported Project mappings are not blockers to Tracker capture.** They remain clearly labelled local/intent-only until separately proven.

This distinction is deliberate. We do not need to prove partial-progress MSPDI write-back before building useful partial-progress tracking.

## Current Project interoperability status

### Intent log only

The candidate XML remains byte-for-byte identical to the imported source. A separate JSON record captures execution intent.

### Task scalar diagnostic

Retained only as a diagnostic known to be insufficient for coherent assigned-task completion.

### Assigned completion native v0

Microsoft Project-verified on the bounded single-assignment BOILER case merged in PR #75. The profile remains deliberately fail-closed outside its proven shape.

### Bulk reporting-cut experiment

PR #77 contains useful 13-task native evidence and a Sunday/Monday reporting-cycle experiment. It is **not a prerequisite for continuing product development**. Review findings on that branch should be classified by whether they invalidate the tested evidence or block a current user capability, rather than automatically expanding the validator until every theoretical edge case is closed.

## Forward-progress rule

Substantial work should do at least one of the following:

- add a user-visible capability to the current milestone;
- run an experiment whose answer changes what we build next;
- fix a defect that blocks or corrupts the current milestone; or
- remove complexity that is preventing delivery.

Tests, documentation, interoperability research and hardening support those goals. They are not progress by themselves.

When an unsupported edge case is discovered, prefer a clear fail-closed/unsupported state unless that case is present in the target workflow or prevents the current milestone from working.

## Current workflow

```text
Microsoft Project XML/MSPDI
        ↓
Import locally in browser
        ↓
Browse hierarchy + executable tasks
        ↓
Record Tracker execution state / observations
        ↓
Keep unsupported Project mappings local / intent-only
        ↓
For proven shapes only: generate separate candidate XML
        ↓
Optional Microsoft Project open / recalculate / result comparison
        ↓
Export Tracker workspace/evidence JSON
```

The imported source is never overwritten.

## Deliberate current exclusions

Do not add these merely because they are plausible future product features:

- production backend/database/authentication;
- production Mobile/offline architecture;
- broad role/approval machinery;
- native MPP writing;
- automatic Microsoft Project control;
- CPM/scheduling engine ownership inside this repository;
- broad compatibility certification;
- infrastructure whose only purpose is future-proofing.

They can be introduced later when a working product slice demonstrates a concrete need.

## Run locally

```text
npm install
npm run check
npm test
npm run build
npm run serve
```

Then open the displayed local address.

See `docs/NEXT-MILESTONE.md` for the active acceptance boundary and delivery guardrails.
