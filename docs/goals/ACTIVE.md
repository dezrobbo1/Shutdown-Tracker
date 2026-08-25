# Active Goal: Tier 1 Console Project Round-Trip Trial

## Outcome

Provide an opt-in, frontend-only Tier 1 Console trial that loads a disposable Microsoft Project XML/MSPDI source into browser memory, applies realistic Tracker execution/progress evidence, generates a separate complete-source experimental candidate, and supports manual Microsoft Project recalculation plus local result comparison.

## Success criteria

- `VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL=true` enables a clearly labelled browser-local/no-persistence/no-approved-contract workflow while default Export remains not finalised.
- The exact original XML remains unchanged and drives a temporary imported hierarchy with preserved Project task UID/ID/WBS and source facts.
- Synthetic Tier 1 has whole-project Console authority and may exercise Can't Start, Start, Pause, Resume, Finish, and field-progress observation on every executable leaf.
- No mapping is included by default. The reviewer explicitly selects supported proposals for Actual Start, Actual Finish, `% Complete`, or `Physical % Complete`.
- A source-preserving browser patcher applies only selected fields to one exact task identity, fails safely on missing/duplicate/stale/unsupported targets, and creates a separate candidate with source/candidate hashes.
- The reviewer can download the candidate, operate Microsoft Project manually, re-import a new XML result locally, conservatively compare selected inputs and other differences, and record a disposable evidence disposition.
- Reset/discard removes generated session state without changing or overwriting the source.
- Existing deterministic operational trial and Mobile interaction model remain intact.

## Non-goals

- Production backend, API, authentication, persistence, adoption, approval, audit, offline, or database behaviour.
- PR #48's candidate approval, sealed preview, batch approval, review bootstrap, or mandatory acceptance workflow.
- A final Tracker-to-Project mapping or export/round-trip contract.
- Native `.mpp`, automatic Microsoft Project operation, Project recalculation inside Shutdown Tracker, scheduling, CPM, or dependency consequences.
- Mobile redesign or production task execution.
- Committing real schedules or generated candidate/result artifacts.

## Required validation

- Run `npm ci`, `npm test`, `npm run build`, repository-standard TypeScript checks, and `git diff --check`.
- Validate changed Markdown links and repository paths.
- Prove source retention, exact UID targeting, explicit mapping selection, selective complete-source patching, safe failures, result identity/input checks, conservative difference classification, and deterministic reset.
- Confirm no backend Java, worker, migration, API-contract, auth, Mobile UI, fixture, dependency/lockfile, real Project data, generated artifact, or final export-authority change.

## Safety constraints

- Do not merge or mark the draft pull request ready.
- Do not modify `main` directly, rewrite history, force-push, rebase, amend, squash, or use destructive cleanup commands.
- Do not modify Issue #57.
- Keep Microsoft Project as schedule calculation and master-file authority.
- Never overwrite the imported source or imply a trial disposition is production approval.

## Completion conditions

The slice is complete when implementation, tests, and documentation agree; required validation passes; the complete diff is frontend/product-documentation scoped; and a draft `frontend/tier1-console-roundtrip-trial -> main` pull request presents the evidence workflow without claiming a production backend or final Project export contract.
