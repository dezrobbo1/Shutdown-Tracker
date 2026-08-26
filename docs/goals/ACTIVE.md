# Active Goal: Remove Fictional Frontend Review Content

## Outcome

Remove the remaining fictional project, task, person, execution, Critical, activity, settings, persona, and sync data from the ordinary Console and Mobile applications. Preserve neutral empty product shells and the separate imported Tier 1 Project round-trip trial.

## Success criteria

- Ordinary Console mode starts without a fabricated project or operational day.
- Projects Home and ordinary Today, Tasks, Critical, Task Dashboard, and Project Settings show honest unconfigured/empty states rather than fictional records.
- Ordinary Import / Export retains browser-local MSPDI/XML inspection, optional configured read-only snapshot GETs, and visibly deferred Export.
- Mobile retains `Assigned Tasks` as its only top-level operational destination but shows no fictional persona, assignment, task, execution, Critical, history, or sync state.
- The ordinary Console review client describes a missing project configuration as unconfigured, not synthetic.
- The explicit `VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL=true` evidence workflow remains unchanged and uses only the schedule selected by the reviewer.
- Documentation and tests distinguish empty runtime shells from safe synthetic test fixtures.

## Non-goals

- Mobile information-architecture redesign or production Mobile execution.
- Production backend, API, authentication, persistence, audit, offline, database, or migration work.
- New Tracker execution, assignment, Critical reporting, or project-lifecycle product behaviour.
- Removal of synthetic test fixtures or fixture-safety rules; those prevent real operational schedules from entering the repository.
- A final Tracker-to-Project mapping or export/round-trip contract.
- PR #48's candidate approval, sealed preview, batch approval, review bootstrap, or mandatory acceptance workflow.
- Native `.mpp`, automatic Microsoft Project operation, Project recalculation inside Shutdown Tracker, scheduling, CPM, or dependency consequences.

## Required validation

- Run `npm ci`, `npm test`, `npm run build`, repository-standard TypeScript checks, and `git diff --check`.
- Validate changed Markdown links and repository paths.
- Confirm former fictional project, task, person, persona, activity, Critical, and sync content is absent from active frontend source.
- Re-run the Tier 1 Project round-trip tests and confirm imported hierarchy, execution, mapping, source-preserving candidate generation, result comparison, and reset remain intact.
- Confirm no backend Java, worker, migration, API-contract, authentication, real Project data, or generated artifact changes.

## Safety constraints

- Do not merge or mark the draft pull request ready.
- Do not modify `main` directly, rewrite history, force-push, rebase, amend, squash, or use destructive cleanup commands.
- Keep Microsoft Project as schedule calculation and master-file authority.
- Never overwrite an imported source or imply a trial disposition is production approval.
- Keep Mobile's approved top-level model fixed to Assigned Tasks; the empty state is a data removal, not a redesign.

## Completion conditions

The slice is complete when runtime code, tests, and documentation agree that ordinary frontend shells contain no fictional operational data; the imported Tier 1 round-trip trial remains functional and explicitly bounded; required validation passes; and a draft `frontend/remove-synthetic-review-content -> main` pull request reports the correction without claiming production behaviour or a final Project export contract.
