# Active Goal: Remove the Fixed Synthetic Operational Trial

## Outcome

Remove the fixed fictional deterministic operational trial from the Console, Mobile App, shared trial model, tests, and documentation. Preserve the ordinary static review shells and the separate imported Tier 1 Project round-trip trial.

## Success criteria

- The legacy fixed-trial and Mobile-bridge environment variables no longer enable or configure application behaviour.
- The fixed scenario, guided checklist, synthetic personas, simulated scenario clock, and Console-Mobile trial bridge are removed.
- Mobile remains the existing static/synthetic `Assigned Tasks -> Task Detail` visual shell; this change does not redesign its information architecture or interaction model.
- The Console retains ordinary static review behaviour and the explicit `VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL=true` evidence workflow.
- The shared TypeScript model retains only the in-memory Tier 1 execution state, action reducer, and projections required by the imported round-trip adapter.
- Documentation and implementation status no longer present the removed fixed trial as current capability or product authority.
- The imported Tier 1 trial remains browser-local, disposable, XML/MSPDI-only, and experimental. It does not establish production persistence or an approved export contract.

## Non-goals

- Mobile redesign or production Mobile execution.
- Production backend, API, authentication, persistence, audit, offline, database, or migration work.
- New Tracker execution, assignment, Critical reporting, or project-lifecycle product behaviour.
- A final Tracker-to-Project mapping or export/round-trip contract.
- PR #48's candidate approval, sealed preview, batch approval, review bootstrap, or mandatory acceptance workflow.
- Native `.mpp`, automatic Microsoft Project operation, Project recalculation inside Shutdown Tracker, scheduling, CPM, or dependency consequences.

## Required validation

- Run `npm ci`, `npm test`, `npm run build`, repository-standard TypeScript checks, and `git diff --check`.
- Validate changed Markdown links and repository paths.
- Confirm the legacy flags, fixed scenario, guided workflow, linked-window bridge, and removed trial documentation are absent.
- Re-run the Tier 1 Project round-trip tests and confirm imported hierarchy, execution, mapping, source-preserving candidate generation, result comparison, and reset remain intact.
- Confirm no backend Java, worker, migration, API-contract, auth, dependency/lockfile, real Project data, or generated artifact changes.

## Safety constraints

- Do not merge or mark the draft pull request ready.
- Do not modify `main` directly, rewrite history, force-push, rebase, amend, squash, or use destructive cleanup commands.
- Keep Microsoft Project as schedule calculation and master-file authority.
- Never overwrite an imported source or imply a trial disposition is production approval.

## Completion conditions

The slice is complete when code, tests, and documentation agree that the fixed synthetic trial has been removed; the imported Tier 1 round-trip trial remains functional and explicitly bounded; required validation passes; and a draft `frontend/remove-synthetic-trial -> main` pull request reports the removal without claiming production behaviour or a final Project export contract.
