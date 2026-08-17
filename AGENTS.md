# Shutdown Tracker Agent Guidance

This file applies to the entire repository. More specific `AGENTS.md` files may add local guidance for a subtree; the closest applicable file wins.

## Start here

Before changing code or product behaviour:

1. Read the root [README.md](README.md).
2. Read the relevant ADRs in [docs/adr](docs/adr) and the relevant product documents in [docs/product](docs/product).
3. Check [docs/research/source-quality-register.md](docs/research/source-quality-register.md) before relying on research material for a hard product or architecture decision.
4. Inspect the current implementation and tests. Do not infer implemented behaviour from roadmap documents.

Do not assume access to earlier chats, uploaded PDFs, ZIP files, or external project folders. Durable decisions must be present in this repository. If required context is missing or sources conflict, stop rather than inventing a decision.

## Product authority and non-negotiable boundaries

Microsoft Project remains the schedule calculation and master-file authority. Shutdown Tracker is the execution-input, review, evidence, handover, operational-mapping, candidate-preparation, verification-metadata, and audit system.

Use this three-part authority model:

- **Execution-input authority — Shutdown Tracker.** Capture and approve field execution facts such as progress, actual starts/finishes, blockers, evidence, and handover.
- **Calculation authority — Microsoft Project.** A disposable candidate schedule may be recalculated by Microsoft Project after approved inputs are applied. Project-calculated dates, durations, roll-ups, work, slack, criticality, and related consequences are not treated as Shutdown Tracker-authored inputs.
- **Adoption authority — Planner.** A planner reviews the candidate and its source-versus-candidate delta and decides whether to reject it, keep it for review, or manually adopt it as the next master schedule.

Shutdown Tracker must not:

- calculate CPM, critical path, float, resource levelling, recovery scheduling, schedule optimisation, or dependency consequences itself;
- invent planned dates, durations, work, assignment values, slack, criticality, or other Project-calculated consequences;
- silently update, overwrite, or save the accepted master `.mpp`;
- write native `.mpp` files server-side;
- imply that candidate approval, artifact generation, Project open, or verification has already updated the master schedule.

Shutdown Tracker may:

- prepare exact, reviewed execution inputs against an immutable accepted Project snapshot;
- generate an approved-input manifest or candidate artifact;
- invoke or support a planner-controlled Microsoft Project process against a disposable copy, subject to an accepted implementation ADR and safety controls;
- allow Microsoft Project to recalculate the disposable candidate;
- present a read-only source-versus-candidate impact comparison, including Project-calculated schedule consequences;
- record candidate hashes, deltas, Project version, planner decision, and later master-adoption metadata.

The important prohibition is **hidden or independent scheduling by Shutdown Tracker**, not Microsoft Project recalculating a separate review candidate.

Other non-negotiable rules:

- Field progress must pass through supervisor review, planner review, export/input eligibility, and preview before candidate generation.
- Approved input authority is limited to explicitly reviewed facts under the active handoff policy. Summary-task actual inputs, dependencies, constraints, calendars, baselines, WBS structure, and unreviewed planned-date changes remain prohibited direct inputs.
- A Project-calculated consequence may differ from the source candidate after Microsoft Project recalculates; it must be labelled as a Project-calculated consequence rather than as an approved Shutdown Tracker input.
- Critical Work Packages and Critical Watchlists are configurable reporting constructs, not calculated critical-path features.
- Project Operational Mapping may interpret imported fields, hierarchy, and resource-assignment metadata operationally, but imported source values remain immutable.
- Project-derived category membership is not application authorization. Visibility/relevance, responsibility, update permission, review permission, and export authority remain separate.
- Mapping revalidation must never silently remap an uncertain Project source after re-import.
- Communications must start with structured domain records. Entity-linked Discussion may support those records later; generic chat, channels, and private messaging are not an operational source of truth by default.
- Preserve append-only audit history and explicit approval, correction, rejection, and supersession semantics.

Relevant authority documents include:

- [ADR-001: Microsoft Project Integration](docs/adr/ADR-001-microsoft-project-integration.md)
- [ADR-007: Data Ownership and Schedule Authority](docs/adr/ADR-007-data-ownership-and-schedule-authority.md)
- [ADR-008: MVP Scope Boundary](docs/adr/ADR-008-mvp-scope-boundary.md)
- [Project Candidate Schedule Handoff](docs/product/project-candidate-schedule-handoff.md)
- [Task Progress Review and Export Approval](docs/product/task-progress-review-export-approval.md)
- [Approval and Export State Model](docs/product/approval-export-state-model.md)
- [Project Operational Mapping](docs/product/project-operational-mapping.md)
- [Communications Layer](docs/product/communications-layer.md)
- [Offline Audit and Sync Rules](docs/product/offline-audit-sync-rules.md)

## Current implementation guardrails

- Do not infer that a documented target workflow already exists in runtime code.
- Keep write-like frontend controls disabled until the corresponding API, authorization, audit, error, and offline behaviours exist.
- Keep the console top-level navigation fixed to Today, Tasks, Problems, Evidence, and Exports.
- Keep the mobile top-level navigation fixed to My Work, Today, Problems, Evidence, and Sync.
- A read-only planner candidate-impact comparison is allowed; an editable Gantt, dependency editor, or replacement scheduling UI is not.
- Follow [docs/product/ux-anti-slop-rules.md](docs/product/ux-anti-slop-rules.md) and [docs/product/design-language-and-status-semantics.md](docs/product/design-language-and-status-semantics.md).
- The API owns request/response workflows and persistence orchestration. Project parsing and candidate/artifact processing belong in the project worker or a separately reviewed planner companion; do not move Project processing into arbitrary API code.
- For Project Operational Mapping, the worker returns Project source facts/metadata only. The API owns Tracker category/profile meaning, validation decisions, resolved membership orchestration, Scope/Saved Views, authorization, and audit.
- Keep schema changes in versioned SQL files under `infra/migrations`. Do not rewrite an already applied migration.
- Use only synthetic or explicitly approved sanitized fixtures. Do not commit real schedules, real Project files, customer data, secrets, generated candidate schedules, screenshots containing operational data, or unrelated binaries.

## Repository map

- `apps/console`: React/Vite Master Console.
- `apps/mobile-pwa`: React/Vite Field App.
- `packages/api-client`: shared TypeScript API client.
- `services/api`: Java 21 Spring Boot API.
- `services/project-worker`: Java 21 Spring Boot MPXJ worker.
- `packages/project-import-contract` and `packages/project-export-contract`: shared Java handoff contracts.
- `infra/migrations`: PostgreSQL/Flyway-compatible migrations.
- `fixtures`: synthetic test and review inputs only.
- `docs`: product, ADR, architecture, security, testing, concept, research, and source catalogues.

## Working rules

- Begin with `git status -sb` and preserve unrelated or pre-existing changes.
- Keep each branch and PR focused on one reviewed outcome.
- Prefer the smallest coherent change. Avoid broad rewrites, dependency upgrades, formatting churn, or speculative abstractions without explicit scope.
- Update the relevant product or architecture document when a change alters an approved boundary, workflow, state model, permission, or ownership rule.
- Keep environment-specific secrets and generated files out of Git.
- Never use `git reset --hard`, `git clean -fd`, force-push, or rewrite another worktree without explicit authorization.
- Never merge a pull request or mark a draft ready unless explicitly instructed.

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

Migration changes:

```text
./scripts/db/validate-migrations.sh
```

For every change:

```text
git diff --check
```

For Project handoff changes, distinguish three different claims:

1. the approved input manifest is correct;
2. Microsoft Project produced a candidate schedule and calculated consequences;
3. a planner accepted or adopted that candidate.

Do not use evidence for one claim as proof of another. Manual Microsoft Project testing remains required for handoff milestones.

## Definition of done

A change is complete only when its scope is clear, relevant checks pass, documentation and tests agree with the implementation, product boundaries remain explicit, temporary artifacts are absent, unrelated worktrees remain unchanged, and the final handoff states what changed, what was verified, and what remains deliberately unimplemented or pending manual validation.
