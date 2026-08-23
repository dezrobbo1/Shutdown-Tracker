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

Microsoft Project remains the schedule calculation and master-file authority. Shutdown Tracker is the execution-input, review, evidence, handover, operational-mapping, candidate-preparation, verification-metadata, and audit system.

The handoff is intended to produce a **complete updated Project candidate schedule**, not merely a sparse field patch.

Use this three-part authority model:

- **Execution/input authority — Shutdown Tracker.** Capture and approve field execution facts and authorised Tier 1-entered inputs such as progress or actuals under the active handoff policy.
- **Calculation authority — Microsoft Project.** A complete updated candidate schedule may be recalculated by Microsoft Project after approved inputs are applied. Project-calculated dates, durations, roll-ups, work, assignment values, timephased data, slack, criticality, and related consequences are not treated as Shutdown Tracker-authored inputs.
- **Candidate/adoption authority — Tier 1-controlled decision.** Tier 1 reviews the candidate and its source-versus-candidate delta and records whether to reject it, retain it for review, adopt it as the next schedule/master, or have it merged/imported into another existing schedule. The relevant schedule owner or Microsoft Project operator performs any external Project operation required by that decision.

Shutdown Tracker must not:

- calculate CPM, critical path, float, resource levelling, recovery scheduling, schedule optimisation, or dependency consequences itself;
- invent planned dates, durations, work, assignment values, slack, criticality, or other Project-calculated consequences;
- silently update, overwrite, or save the accepted master `.mpp`;
- silently merge/import a candidate into the only master copy;
- write native `.mpp` files server-side;
- imply that input approval, candidate generation, Project open, candidate acceptance, or verification has already updated the master schedule.

Shutdown Tracker may:

- prepare exact, reviewed execution inputs against an immutable accepted Project snapshot;
- accept permitted Tier 1-entered inputs in the Master Console with full provenance and policy checks;
- generate a sealed approved-input manifest;
- generate a complete updated MSPDI/XML candidate from the accepted source plus approved inputs;
- invoke or support a Tier 1-controlled Microsoft Project process against a disposable copy, subject to an accepted implementation ADR and safety controls;
- allow Microsoft Project to recalculate the disposable candidate;
- present a read-only source-versus-candidate impact comparison, including Project-calculated schedule consequences;
- allow Tier 1 to reject, retain, or record an adopt/merge disposition and allow the relevant schedule owner or Microsoft Project operator to carry out the external Project action;
- record candidate hashes, deltas, Project version, Tier 1 decision, destination-before/result-after merge provenance, and later master-adoption metadata.

The important prohibition is **hidden or independent scheduling by Shutdown Tracker**, not Microsoft Project recalculating or an authorised schedule owner or Microsoft Project operator deliberately using a reviewed candidate schedule after Tier 1 review.

Other non-negotiable rules:

- Field progress must pass through Tier 2 tracking validation where required, Tier 1 input review, input eligibility, and preview before candidate generation.
- Tier 1-originated Console inputs may skip Tier 2 tracking validation only when project policy explicitly allows it; they must not skip provenance, stale-data checks, policy checks, exact approval binding, or Tier 1 input authority.
- Approved input authority is limited to explicitly reviewed facts under the active handoff policy. Summary-task actual inputs, dependencies, constraints, calendars, baselines, WBS structure, and unreviewed planned-date changes remain prohibited direct inputs unless a later explicit product decision expands authority.
- A Project-calculated consequence may differ from the source after Microsoft Project recalculates; label it as a Project-calculated consequence rather than an approved Shutdown Tracker input.
- Manual edits made by a schedule owner or Microsoft Project operator during candidate review must be distinguished from both approved Tracker inputs and Project-calculated consequences.
- Candidate acceptance is not the same as `adopted_as_new_master` or `merged_into_existing`; record those outcomes separately.
- Merge/import testing must be separate from standalone candidate testing and must use a disposable/backed-up destination schedule before production use.
- Critical items and Critical Work Packs are configurable reporting constructs, not calculated critical-path features.
- Project Operational Mapping may interpret imported fields, hierarchy, and resource-assignment metadata operationally, but imported source values remain immutable.
- Project-derived category membership is not application authorization. Tier 1 whole-project authority and explicit Tier 2/Tier 3 task or reporting assignments determine access; categories remain filter, display, reporting, and bulk-selection context only.
- Mapping revalidation must never silently remap an uncertain Project source after re-import.
- Communications must start with structured domain records. Entity-linked Discussion may support those records later; generic chat, channels, and private messaging are not an operational source of truth by default.
- Preserve append-only audit history and explicit approval, correction, rejection, supersession, candidate-disposition, adoption, and merge provenance.

Relevant authority documents include:

- [Product Flow and Software Map](docs/product/product-flow-and-software-map.md)
- [User Tier and Assignment Model](docs/product/user-tier-and-assignment-model.md)
- [Task Operational Model](docs/product/task-operational-model.md)
- [Critical Reporting Model](docs/product/critical-reporting-model.md)
- [Project Lifecycle and Import / Export](docs/product/project-lifecycle-and-import-export.md)
- [Implementation Status Map](docs/product/implementation-status-map.md)
- [ADR-001: Microsoft Project Integration](docs/adr/ADR-001-microsoft-project-integration.md)
- [ADR-007: Data Ownership and Schedule Authority](docs/adr/ADR-007-data-ownership-and-schedule-authority.md)
- [ADR-008: MVP Scope Boundary](docs/adr/ADR-008-mvp-scope-boundary.md)
- [Project Candidate Schedule Handoff](docs/product/project-candidate-schedule-handoff.md)
- [Task Progress Review and Project Input Approval](docs/product/task-progress-review-export-approval.md)
- [Approval, Candidate Schedule, and Adoption State Model](docs/product/approval-export-state-model.md)
- [Project Operational Mapping](docs/product/project-operational-mapping.md)
- [Communications Layer](docs/product/communications-layer.md)
- [Offline Audit and Sync Rules](docs/product/offline-audit-sync-rules.md)

The six product documents listed first are primary authority. No old named-role matrix or area/package/contract/watchlist permission-scope model is authoritative. The application user types are Tier 1, Tier 2, and Tier 3 only.

## Current implementation guardrails

- Do not infer that a documented target workflow already exists in runtime code.
- Do not describe the existing minimal/patch-shaped MSPDI writer as the final complete candidate-schedule implementation unless the code and manual evidence actually prove that.
- The current worker's narrow field allowlist is a **direct-input boundary**. It does not mean a Microsoft Project-calculated candidate may differ from the source only in those fields.
- A pre-Project protected-fingerprint test may prove that Shutdown Tracker did not inject unapproved direct inputs. Do not apply that same invariant to a candidate after Microsoft Project has recalculated it.
- Keep write-like frontend controls disabled until the corresponding API, authorization, audit, error, and offline behaviours exist.
- Keep the Console top-level structure fixed to Today, Tasks, Critical, Import / Export, and Project Settings.
- Keep the Mobile App top-level model fixed to Assigned Tasks only. Sync is a visible transport/recovery state, not a destination.
- Keep Problems, Discussion, Actions, Evidence, and History inside the relevant Task Dashboard. Do not recreate them as top-level applications.
- Console access is Tier 1 only. Mobile access is Tier 2/Tier 3 only and remains explicitly assignment-bounded.
- A read-only Tier 1 candidate-impact comparison is allowed; an editable Gantt, dependency editor, or replacement scheduling UI is not.
- Follow [docs/product/ux-anti-slop-rules.md](docs/product/ux-anti-slop-rules.md) and [docs/product/design-language-and-status-semantics.md](docs/product/design-language-and-status-semantics.md).
- The API owns request/response workflows and persistence orchestration. Project parsing and candidate/artifact processing belong in the project worker or a separately reviewed Microsoft Project companion; do not move Project processing into arbitrary API code.
- For Project Operational Mapping, the worker returns Project source facts/metadata only. The API owns Tracker category/profile meaning, validation decisions, resolved membership orchestration, query-only Scope/Saved Views, explicit assignment orchestration, authorization, and audit.
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

Use guarded scripts in `scripts/review` only when their prerequisites and explicit synthetic-data safety switches match the task. Never treat a smoke-script result as manual Microsoft Project verification.

For migration changes, prove both a clean installation and an upgrade from the previous populated baseline. Use PostgreSQL integration tests for constraints, triggers, foreign keys, row locks, concurrency, and rollback behaviour; fake repositories are not sufficient evidence for database invariants.

For export/candidate changes, prove separately that:

1. no unauthorized direct input field, task, value, source, stale approval, stale baseline, summary-task actual, or unsupported policy version can reach the worker;
2. the complete candidate is derived from the intended accepted source and approved-input manifest;
3. Microsoft Project can open/import and recalculate the candidate;
4. Project-calculated consequences are classified rather than rejected merely for changing protected schedule fields;
5. unexplained differences, source overwrite, wrong-task application, or lost approved inputs fail safe;
6. Tier 1 adoption/merge is a separate recorded outcome.

Before declaring completion, inspect the complete diff, confirm no temporary files remain, and verify unrelated worktrees are unchanged.

## Definition of done

A change is complete only when its scope is clear, relevant checks pass, migration/integration evidence matches the claimed invariants, documentation and tests agree with the implementation, product boundaries remain explicit, `git diff --check` passes, temporary artifacts are absent, unrelated worktrees remain unchanged, and the final handoff states what changed, what was verified, and what remains deliberately unimplemented or pending manual validation.
