# Active Goal: Start the Tier 1 Round-Trip Trial from Import

## Outcome

Remove the dead end between ordinary browser-local Project XML inspection and the existing Tier 1 round-trip trial. A reviewer who selects a valid XML/MSPDI source must be able to review it and explicitly start the temporary browser-memory trial from that same retained source.

## Success criteria

- Ordinary Import uses the lossless XML reader, exact source bytes/text, SHA-256, parser, and adapter already used by the Tier 1 round-trip trial.
- Selecting a file inspects it but does not activate a trial automatically.
- A visible `Start round-trip trial` action becomes available for a valid inspected source.
- Explicit Start promotes that exact source into temporary round-trip state and opens the imported Tasks hierarchy.
- The environment flag remains available as a direct-entry shortcut rather than the only usable activation path.
- Discard returns a session-started trial to the ordinary empty Console when the direct-entry flag is off.
- Ordinary Export remains deferred until a round-trip session is explicitly active.
- Large local sources expose an honest inspecting/ready state.

## Non-goals

- Production import, persistence, backend, API, authentication, audit, database, or migration work.
- Automatic activation on file selection.
- A final Tracker-to-Project mapping or export/round-trip contract.
- PR #48's candidate approval, sealed preview, batch approval, review bootstrap, or mandatory acceptance workflow.
- Native `.mpp`, automatic Microsoft Project operation, Project recalculation inside Shutdown Tracker, scheduling, CPM, or dependency consequences.
- Mobile changes.

## Required validation

- Run `npm ci`, `npm test`, `npm run build`, repository-standard TypeScript checks, and `git diff --check`.
- Validate changed Markdown links and repository paths.
- Exercise the import/start path against the supplied XML sources locally without committing them.
- Re-run all Tier 1 round-trip source, execution, mapping, candidate, result-comparison, and reset tests.
- Confirm no backend Java, worker, migration, API-contract, authentication, real Project data, or generated artifact changes.

## Safety constraints

- Do not merge or mark the draft pull request ready.
- Do not modify `main` directly, rewrite history, force-push, rebase, amend, squash, or use destructive cleanup commands.
- Keep Microsoft Project as schedule calculation and master-file authority.
- Never overwrite an imported source or imply a trial disposition is production approval.
- Keep all selected source and trial state in browser memory only.

## Completion conditions

The slice is complete when ordinary Import can explicitly start the existing browser-local Tier 1 round-trip workflow from the exact inspected source; the trial boundaries remain visible; required validation passes; and a draft `frontend/enable-roundtrip-from-import -> main` pull request reports the correction without claiming production behaviour or a final Project export contract.
