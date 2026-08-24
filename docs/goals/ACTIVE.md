# Active Goal: Deterministic Frontend Operational Trial

## Outcome

Provide an opt-in, deterministic, frontend-only operational trial on the merged three-tier product foundation so a human reviewer can exercise Tier 1, Tier 2, and Tier 3 shutdown workflows before production backend design begins.

## Success criteria

- `VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true` explicitly enables a clearly labelled synthetic/local/no-persistence experience while default frontend behaviour remains intact.
- One shared pure TypeScript model owns the fixed fictional project, simulated time, users, assignments, execution events, pauses, progress observations, problems, actions, Critical configuration/obligations/reports, and activity history.
- The fixed simulation clock supports `+15 minutes`, `+1 hour`, next event, next report due, next shift boundary, and exact Reset/replay.
- Console Today, Tasks, Task Dashboard, Tier 2 tracking assignment, Critical configuration/oversight, and recent activity derive from the shared trial state.
- Tier 2 Mobile sees only tracking assignments, can delegate to direct-report Tier 3 while retaining responsibility, and can submit/correct contextual Critical reports.
- Tier 3 Mobile sees only assigned tasks and can exercise Can't Start, Start, Pause, Resume, Finish, and plain-language end-of-shift unfinished progress using simulated system-captured times.
- Planned-time passage never establishes In Progress. Pause remains distinct from an adverse delay, and Resume never silently resolves a linked problem.
- Critical policy timing, triggers, supported content, item overrides, version history, known-fact reuse, obligations, immutable reports, and superseding corrections can be reviewed without a generic form builder.
- Today and Task Dashboard History derive from the same event history.
- Reset reproduces the exact starting state and removes every generated trial record.
- An optional, strictly validated, ephemeral Console-opened Mobile bridge can share the canonical in-memory trial state without persistence or a production protocol.
- A guided checklist supports the documented operational sequence without automatic animation or blocking free interaction.

## Non-goals

- Production authentication, membership, authorization, assignment, execution, Critical, mapping, lifecycle, or project-creation APIs.
- Backend Java, worker Java, database migrations, production persistence, API-contract changes, or offline queue/background sync.
- A generic form builder, scheduling engine, CPM/critical-path calculation, resource levelling, schedule editing, or native `.mpp` writer.
- Reinstating the superseded PR #48 candidate/approval/acceptance workspace.
- Defining the final Microsoft Project export, round-trip, comparison, adoption, or verification contract.
- Using real schedules, customer/site data, generated candidate artifacts, or system wall-clock/random trial state.
- Beginning the production task-execution backend.

## Required validation

- Install the locked frontend dependencies with `npm ci`.
- Run all Console, Mobile, shared API-client, and shared trial-model tests with `npm test`.
- Run repository-standard TypeScript no-emit checks and both production frontend builds with `npm run build`.
- Run `git diff --check`.
- Validate changed Markdown links and repository-path references.
- Confirm deterministic tests cover reset, task-state derivation, Can't Start, Start, Pause, Resume, Finish, shift progress, assignment visibility, reporting mechanisms, immutable reports/supersession, Today, and task history.
- Confirm no backend Java, worker Java, migration, API-contract, Project-fixture, generated-artifact, real operational-data, or final export-contract changes.
- Confirm any manifest/lockfile change is limited to the local shared TypeScript workspace and introduces no new third-party dependency or version.

Maven and migration validation are not required locally unless backend/shared Java or migration files change accidentally. Repository CI may still run its standard independent jobs.

## Safety constraints

- Do not merge or mark the draft pull request ready.
- Do not modify `main` directly, rewrite history, force-push, rebase, amend, squash, or use destructive cleanup commands.
- Do not modify Issue #57.
- Do not commit real Project schedules, generated Project candidates, local build output, credentials, customer/site data, or uploaded source material.
- Keep Microsoft Project as schedule calculation and master-file authority.
- Keep Console and Mobile as separate clients; the optional trial bridge must remain ephemeral and trial-only.
- Do not describe local deterministic behaviour as production persistence, API wiring, offline sync, or authorization enforcement.

## Completion conditions

The trial slice is complete when the implementation and documentation agree, all required validation passes, the complete diff is frontend/product-documentation scoped, and a draft `frontend/deterministic-operational-trial -> main` pull request presents the scenario and human-review questions without claiming production backend or final Project export behaviour.
