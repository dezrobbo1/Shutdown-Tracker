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

The handoff is intended to produce a **complete updated Project candidate schedule**, not merely a sparse field patch.

Use this three-part authority model:

- **Execution/input authority — Shutdown Tracker.** Capture and approve field execution facts and authorised planner-entered inputs such as progress or actuals under the active handoff policy.
- **Calculation authority — Microsoft Project.** A complete updated candidate schedule may be recalculated by Microsoft Project after approved inputs are applied. Project-calculated dates, durations, roll-ups, work, assignment values, timephased data, slack, criticality, and related consequences are not treated as Shutdown Tracker-authored inputs.
- **Candidate/adoption authority — Planner.** A planner reviews the candidate and its source-versus-candidate delta and decides whether to reject it, retain it for review, use it as the next schedule/master, or use Microsoft Project to merge/import it into another existing schedule.

Shutdown Tracker must not:

- calculate CPM, critical path, float, resource levelling, recovery scheduling, schedule optimisation, or dependency consequences itself;
- invent planned dates, durations, work, assignment values, slack, criticality, or other Project-calculated consequences;
- silently update, overwrite, or save the accepted master `.mpp`;
- silently merge/import a candidate into the only master copy;
- write native `.mpp` files server-side;
- imply that input approval, candidate generation, Project open, candidate acceptance, or verification has already updated the master schedule.

Shutdown Tracker may:

- prepare exact, reviewed execution inputs against an immutable accepted Project snapshot;
- accept permitted planner-entered inputs in the Master Console with full provenance and policy checks;
- generate a sealed approved-input manifest;
- generate a complete updated MSPDI/XML candidate from the accepted source plus approved inputs;
- invoke or support a planner-controlled Microsoft Project process against a disposable copy, subject to an accepted implementation ADR and safety controls;
- allow Microsoft Project to recalculate the disposable candidate;
- present a read-only source-versus-candidate impact comparison, including Project-calculated schedule consequences;
- allow the planner to reject, retain, adopt, or merge/import the candidate through Microsoft Project;
- record candidate hashes, deltas, Project version, planner decision, destination-before/result-after merge provenance, and later master-adoption metadata.

The important prohibition is **hidden or independent scheduling by Shutdown Tracker**, not Microsoft Project recalculating or a planner deliberately using a reviewed candidate schedule.

Other non-negotiable rules:

- Field progress must pass through supervisor review where required, planner input review, input eligibility, and preview before candidate generation.
- Planner-originated Console inputs may skip supervisor review only when project policy explicitly allows it; they must not skip provenance, stale-data checks, policy checks, or planner input authority.
- Approved input authority is limited to explicitly reviewed facts under the active handoff policy. Summary-task actual inputs, dependencies, constraints, calendars, baselines, WBS structure, and unreviewed planned-date changes remain prohibited direct inputs unless a later explicit product decision expands authority.
- A Project-calculated consequence may differ from the source after Microsoft Project recalculates; label it as a Project-calculated consequence rather than an approved Shutdown Tracker input.
- Planner edits made directly in Microsoft Project during candidate review must be distinguished from both approved Tracker inputs and Project-calculated consequences.
- Candidate acceptance is not the same as `adopted_as_new_master` or `merged_into_existing`; record those outcomes separately.
- Merge/import testing must be separate from standalone candidate testing and must use a disposable/backed-up destination schedule before production use.
- Critical Work Packages and Critical Watchlists are configurable reporting constructs, not calculated critical-path features.
- Project Operational Mapping may interpret imported fields, hierarchy, and resource-assignment metadata operationally, but imported source values remain immutable.
- Project-derived category membership is not application authorization. Visibility/relevance, responsibility, update permission, review permission, and export authority remain separate.
- Mapping revalidation must never silently remap an uncertain Project source after re-import.
- Communications must start with structured domain records. Entity-linked Discussion may support those records later; generic chat, channels, and private messaging are not an operational source of truth by default.
- Preserve append-only audit history and explicit approval, correction, rejection, supersession, candidate-disposition, adoption, and merge provenance.

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
- Do not describe the existing minimal/patch-shaped MSPDI writer as the final complete candidate-schedule implementation unless the code and manual evidence actually prove that.
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

For Project handoff changes, distinguish these claims:

1. the approved input manifest is correct;
2. a complete updated candidate schedule was generated from the intended accepted source;
3. Microsoft Project opened/imported and recalculated the candidate correctly;
4. the planner reviewed and accepted/rejected the candidate;
5. the planner adopted it as the next schedule or merged/imported it into an existing schedule, if either occurred.

Do not use evidence for one claim as proof of another. Standalone candidate testing and merge/import testing are separate evidence gates. Manual Microsoft Project testing remains required for handoff milestones.

## Definition of done

A change is complete only when its scope is clear, relevant checks pass, documentation and tests agree with the implementation, product boundaries remain explicit, temporary artifacts are absent, unrelated worktrees remain unchanged, and the final handoff states what changed, what was verified, and what remains deliberately unimplemented or pending manual validation.
