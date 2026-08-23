# Active Goal: Product Trial Foundation

## Outcome

Maintain a reviewable product and frontend foundation directly on `main` for deterministic operational trials of the approved Tier 1/Tier 2/Tier 3 model.

## Success criteria

- Product authority defines exactly three application tiers and two separate clients.
- Console represents Login, Projects Home, Today, Tasks, Critical, Import / Export, Project Settings, and the task-centred Task Dashboard.
- Mobile represents Assigned Tasks and Task Detail only.
- The static execution model preserves Can't Start, Start, Pause, Resume, Finish, system-captured event time, and end-of-shift field progress.
- Critical reporting uses a configurable versioned per-item policy, supported content catalogue, Tier 2 reporting assignment, immutable reports, and superseding corrections.
- Import review retains independently useful immutable-source, snapshot, lineage, read-only API, and browser MSPDI inspection foundations.
- Export is visibly not finalised; experimental compatibility code does not define current product authority.

## Non-goals

- Production authentication, membership, assignment, execution, Critical, mapping, lifecycle, or project-creation APIs.
- Database migrations or changes to existing backend contracts.
- A generic form builder, scheduling engine, CPM/critical-path calculation, or native `.mpp` writer.
- Reinstating the superseded candidate-approval workspace or defining the final Project export/round-trip contract.
- A full deterministic operational-trial harness; that is the next bounded slice.

## Required validation

- Install the locked frontend dependencies.
- Run all Console, Mobile, and shared API-client tests.
- Run TypeScript no-emit checks and both production frontend builds.
- Run `git diff --check`.
- Validate changed Markdown links and repository-path references.
- Confirm no backend Java, worker Java, migration, API-contract, dependency, lockfile, Project-fixture, generated-artifact, or real operational-data changes.

## Safety constraints

- Do not merge or mark a draft pull request ready without explicit authorization.
- Do not modify or rewrite existing PR/branch history.
- Do not commit real Project schedules, generated Project candidates, local build output, credentials, or customer/site data.
- Keep Microsoft Project as schedule calculation and master-file authority.

## Completion conditions

The foundation is complete when it is validated directly against `main`, the replacement draft PR is open, the old stacked PRs remain unchanged, and the retained/excluded technical work is explicit enough for reviewers to confirm that no hidden dependency remains.
