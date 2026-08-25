# Shutdown Tracker Agent Guidance

This file applies to the entire repository. More specific `AGENTS.md` files may add local guidance for a subtree; the closest applicable file wins.

## Start here

Before changing code or product behaviour:

1. Read the root [README.md](README.md).
2. Read the relevant ADRs in [docs/adr](docs/adr) and the relevant product documents in [docs/product](docs/product).
3. Check [docs/research/source-quality-register.md](docs/research/source-quality-register.md) before relying on research material for a hard product or architecture decision.
4. Inspect the current implementation and tests. Do not infer implemented behaviour from roadmap documents.
5. Read [docs/goals/ACTIVE.md](docs/goals/ACTIVE.md) when it exists. It defines the current branch target and completion conditions.

Do not assume access to earlier chats, uploaded PDFs, ZIP files, or external project folders. Durable decisions must be present in this repository. If required context is missing or sources conflict, stop rather than inventing a decision.

## Active goal protocol

When `docs/goals/ACTIVE.md` exists, treat its Outcome, Success criteria, Non-goals, Required validation, Safety constraints, and Completion conditions as the current branch task contract.

Continue autonomously through repository inspection, implementation planning, focused implementation, testing, diff review, documentation, commit preparation, and draft pull-request updates when those actions are authorized by the active goal.

Stop and report rather than guessing when authoritative requirements conflict, required external software prevents completion, proceeding would overwrite unrelated work, or an irreversible externally visible action lacks authorization.

A pending manual or external gate does not justify claiming completion. Finish the automated scope and report the remaining gate precisely.

## Product authority and non-negotiable boundaries

Microsoft Project remains the schedule calculation and master-file authority. Shutdown Tracker owns operational execution truth, task assignments, task-owned records, Critical reporting, imported-snapshot provenance, and audit.

The current bounded frontend evidence capability is the imported Tier 1 Project round-trip trial. It uses browser-local, disposable state to investigate Tracker execution/progress inputs and Project-field proposals without approving a production export contract. The exact Project export, approval, candidate, adoption, and round-trip design remains deferred until evidence supports a separate decision. PR #48 and candidate/export code already present on main are technical history or experimental infrastructure, not active product authority or delivery prerequisites.

Shutdown Tracker must not:

- calculate CPM, critical path, float, resource levelling, recovery scheduling, schedule optimisation, or dependency consequences itself;
- invent planned dates, durations, work, assignment values, slack, criticality, or other Project-calculated consequences;
- silently update, overwrite, or save the accepted master `.mpp`;
- silently merge/import a candidate into the only master copy;
- write native `.mpp` files server-side;
- imply that an experimental export, preview, candidate, or verification record has updated the master schedule.

Shutdown Tracker may:

- import, hash, parse, inspect, and retain immutable Project source/snapshot facts;
- use imported dates, hierarchy, assignments, progress, and Project Critical values as read-only source context;
- capture audited Tracker execution events and field progress observations separately from imported state;
- run explicitly authorized browser-local product trials over disposable imported source data; and
- retain bounded export code as explicitly labelled experimental infrastructure while the final contract is reconsidered.

Other non-negotiable rules:

- Critical items and Critical Work Packs are configurable reporting constructs, not calculated critical-path features.
- Project Operational Mapping may interpret imported fields, hierarchy, and resource-assignment metadata operationally, but imported source values remain immutable.
- Project-derived category membership is not application authorization. Tier 1 whole-project authority and explicit Tier 2/Tier 3 task or reporting assignments determine access; categories remain filter, display, reporting, and bulk-selection context only.
- Mapping revalidation must never silently remap an uncertain Project source after re-import.
- Communications must start with structured domain records. Entity-linked Discussion may support those records later; generic chat, channels, and private messaging are not an operational source of truth by default.
- Preserve append-only audit history and explicit correction, rejection, and supersession provenance.

Relevant authority documents include:

- [Product Flow and Software Map](docs/product/product-flow-and-software-map.md)
- [User Tier and Assignment Model](docs/product/user-tier-and-assignment-model.md)
- [Task Operational Model](docs/product/task-operational-model.md)
- [Critical Reporting Model](docs/product/critical-reporting-model.md)
- [Project Lifecycle and Import / Export](docs/product/project-lifecycle-and-import-export.md)
- [Implementation Status Map](docs/product/implementation-status-map.md)
- [Tier 1 Project Round-Trip Trial](docs/product/tier1-project-roundtrip-trial.md)
- [ADR-012: Product Trial Foundation and Project Export Deferral](docs/adr/ADR-012-product-trial-foundation-and-export-deferral.md)
- [Trial Foundation Retention Map](docs/product/trial-foundation-retention-map.md)
- [Project Operational Mapping](docs/product/project-operational-mapping.md)
- [Communications Layer](docs/product/communications-layer.md)
- [Offline Audit and Sync Rules](docs/product/offline-audit-sync-rules.md)

The six product documents listed first are primary authority. No old named-role matrix or area/package/contract/watchlist permission-scope model is authoritative. The application user types are Tier 1, Tier 2, and Tier 3 only.

## Current implementation guardrails

- Do not infer that a documented target workflow already exists in runtime code.
- Do not describe existing export preview, approval, MSPDI writer, or review-bootstrap code as the approved product workflow.
- Do not reintroduce PR #48's exact candidate approval, sealed preview, browser acceptance workspace, or manual round-trip gate as a product prerequisite without a new product decision and ADR.
- Keep write-like frontend controls disabled until the corresponding API, authorization, audit, error, and offline behaviours exist, except inside an explicitly authorized and visibly labelled frontend-only trial whose changes remain browser-local and disposable.
- Keep the ordinary Mobile execution flow to Can't Start, Start, Pause, Resume, and Finish with system-captured action timestamps. Can't Start must leave execution Not Started; manual backdating/correction requires a separately reviewed audited workflow.
- Keep Critical reporting policy versioned per item, configurable from supported timing/trigger mechanisms and a controlled content catalogue. Reuse known task facts and do not introduce a generic form builder or a second execution-state model.
- Keep the Console top-level structure fixed to Today, Tasks, Critical, Import / Export, and Project Settings.
- Keep the Mobile App top-level model fixed to Assigned Tasks only. Sync is a visible transport/recovery state, not a destination.
- Keep Problems, Discussion, Actions, Evidence, and History inside the relevant Task Dashboard. Do not recreate them as top-level applications.
- Console access is Tier 1 only. Mobile access is Tier 2/Tier 3 only and remains explicitly assignment-bounded.
- A future read-only schedule comparison may be reviewed separately; an editable Gantt, dependency editor, or replacement scheduling UI is not part of the active trial foundation.
- Follow [docs/product/ux-anti-slop-rules.md](docs/product/ux-anti-slop-rules.md) and [docs/product/design-language-and-status-semantics.md](docs/product/design-language-and-status-semantics.md).
- The API owns request/response workflows and persistence orchestration. Project parsing belongs in the project worker; any future candidate/artifact processing requires a separately reviewed design.
- For Project Operational Mapping, the worker returns Project source facts/metadata only. The API owns Tracker category/profile meaning, validation decisions, resolved membership orchestration, query-only Scope/Saved Views, explicit assignment orchestration, authorization, and audit.
- Keep schema changes in versioned SQL files under `infra/migrations`. Do not rewrite an already applied migration.
- Use only synthetic or explicitly approved sanitized fixtures. Do not commit real schedules, real Project files, customer data, secrets, generated candidate schedules, screenshots containing operational data, or unrelated binaries.

## Repository map

- `apps/console`: React/Vite Master Console.
- `apps/mobile-pwa`: React/Vite Mobile App.
- `packages/api-client`: shared TypeScript API client.
- `services/api`: Java 21 Spring Boot API.
- `services/project-worker`: Java 21 Spring Boot MPXJ worker.
- `packages/project-import-contract` and `packages/project-export-contract`: shared Java handoff contracts.
- `infra/migrations`: PostgreSQL/Flyway-compatible migrations.
- `fixtures`: synthetic test and review inputs only.
- `docs`: product, ADR, architecture, security, testing, concept, research, and active-goal authority.

## Working rules

- Begin with `git status -sb` and preserve unrelated or pre-existing changes.
- Keep each branch and PR focused on one reviewed outcome.
- Prefer the smallest coherent change. Avoid broad rewrites, dependency upgrades, formatting churn, or speculative abstractions without explicit scope.
- Follow nearby code patterns and update tests alongside behaviour.
- Update the relevant product or architecture document when a change alters an approved boundary, workflow, state model, permission, or ownership rule.
- Keep environment-specific secrets and generated files out of Git.
- Report assumptions, unavailable checks, and any difference between scaffolding and production behaviour.

## Repository safety

- Never use `git reset --hard`, `git clean -fd`, blanket checkout, or another broad destructive cleanup command.
- Never amend, rebase, squash, rewrite existing commits, or force-push unless the user explicitly authorizes that exact operation.
- Never merge a pull request or mark a draft pull request ready unless explicitly instructed.
- Never modify, reset, clean, or switch another Git worktree.
- Never change machine or user execution policy.
- Never install global tooling without explicit approval.
- Never commit secrets, real Project files, generated MSPDI/XML artifacts, database files, customer/site data, screenshots with operational data, IDE state, or temporary validation output.
- Inspect staged content before committing and preserve unrelated uncommitted work.

## Validation

Run checks from the repository root in proportion to the files changed.

Frontend or shared TypeScript changes:

```text
npm ci
npm test
npm run build
```

Java/backend or shared Java contract changes:

```text
mvn test
```

Migration changes require Docker Desktop or compatible Docker Compose:

```text
./scripts/db/validate-migrations.sh
```

On Windows PowerShell:

```text
.\scripts\db\validate-migrations.ps1
```

For every change:

```text
git diff --check
```

Use guarded scripts in `scripts/review` only when their prerequisites and explicit synthetic-data safety switches match the task. Historical candidate smoke scripts do not define the active product workflow.

For migration changes, prove both a clean installation and an upgrade from the previous populated baseline. Use PostgreSQL integration tests for constraints, triggers, foreign keys, row locks, concurrency, and rollback behaviour; fake repositories are not sufficient evidence for database invariants.

Any production or durable export/candidate change must first establish an approved product contract and ADR, then prove the bounded safety properties claimed by that contract. A separately authorized browser-local evidence trial may precede that decision only when it is opt-in, source-preserving, disposable, independent of PR #48's approval lifecycle, and explicit that no mapping or export contract is approved.

Before declaring completion, inspect the complete diff, confirm no temporary files remain, and verify unrelated worktrees are unchanged.

## Definition of done

A change is complete only when its scope is clear, relevant checks pass, migration/integration evidence matches the claimed invariants, documentation and tests agree with the implementation, product boundaries remain explicit, `git diff --check` passes, temporary artifacts are absent, unrelated worktrees remain unchanged, and the final handoff states what changed, what was verified, and what remains deliberately unimplemented or pending manual validation.
