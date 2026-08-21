# Active Goal — PR #48 Export Integrity Final Review

## Status

Active.

Pull request [#48](https://github.com/dezrobbo1/Shutdown-Tracker/pull/48) must remain **draft** throughout this goal. Do not merge it and do not mark it ready for review.

Expected branch:

`backend/enforce-export-integrity`

The manual Microsoft Project round-trip remains pending.

## Outcome

Bring PR #48 to an independently verified state where the automated **direct-input and export-lifecycle integrity** gates are complete while preserving the repository's accepted three-part Project authority model.

This PR hardens how exact approved inputs reach the current worker and how export/candidate lifecycle facts are recorded. It does **not** establish a product rule that the final Microsoft Project-calculated candidate may differ from the source only in the directly approved fields.

Synchronize this branch with current `origin/main` before merge. Preserve current main's repository cleanup, Project Operational Mapping decisions, and accepted candidate-schedule authority documents. Do not resurrect stale product-boundary wording.

## Authority model that governs this goal

### 1. Execution/input authority — Shutdown Tracker

Shutdown Tracker may capture, review, approve, and audit exact Project-bound execution inputs under the active policy.

The current PR #48 worker contract is intentionally narrow. For policy 1, only these direct input fields may reach that worker:

- `percent_complete`
- `actual_start`
- `actual_finish`

That allowlist is a **direct-input safety boundary**. It is not a final-candidate difference allowlist.

### 2. Calculation authority — Microsoft Project

Microsoft Project owns schedule calculation.

When a complete updated candidate is opened/imported or a future planner-controlled Project companion applies the approved-input manifest, Microsoft Project may legitimately recalculate dependent values including:

- planned start/finish dates;
- durations and remaining values;
- summary roll-ups;
- assignment/work values;
- timephased values;
- slack and criticality;
- project finish and other dependent schedule state.

Those changes are `project_calculated_consequence`, not unauthorized Shutdown Tracker inputs.

A pre-Project allowlist/fingerprint check must never be reused as a rule that rejects a Project-calculated candidate merely because Project changed dependent schedule fields.

### 3. Candidate/adoption authority — Planner

The planner reviews the source-versus-candidate delta and decides whether to reject the candidate, retain it, use it as the next controlled schedule/master, or use Microsoft Project to merge/import it into another schedule.

Candidate generation or verification must not silently overwrite the accepted source/master. Adoption and merge/import are separate recorded planner decisions.

## Current implementation boundary

The existing worker-backed MSPDI/XML generation in PR #48 is minimal/patch-shaped and is useful for proving exact-input authority, lifecycle integrity, and diagnostics.

Do **not** describe that current writer as the complete final candidate-schedule generator unless the implementation and manual evidence prove it.

The product target remains a complete updated candidate generated from the accepted source plus the approved-input manifest, followed by Microsoft Project recalculation and planner review.

A future planner-controlled Microsoft Project desktop companion is not prohibited by this goal. Implementing it is outside PR #48 and requires a separate focused design/implementation review.

## Target direct-input authority chain for PR #48

```text
authoritative input candidate
→ exact candidate-bound approval event
→ preview selection by candidate identity
→ sealed preview line
→ batch approval revalidation
→ generation-time locking and revalidation
→ narrowed direct-input worker request
→ request-specific MSPDI/XML direct-input allowlist
→ generated-artifact lifecycle metadata
```

An approval must authorize one exact execution fact for one project, accepted snapshot, imported task, field, normalized old value, normalized proposed value, source identity/version, candidate identity, and approval identity. It must not be reusable for another task, field, value, snapshot, project, or source version.

## Required final-review corrections

Verify and, where confirmed, correct:

- database-enforced current-policy export-batch immutability with explicit allowed-column deltas;
- rejection of same-state business/lifecycle/provenance mutation except the documented one-time line-set seal;
- immutable approval, generation, Microsoft Project open, and verification facts once established;
- collision-proof lifecycle metadata with caller metadata isolated from server-owned provenance;
- authoritative Microsoft Project open actor/time retained through verification;
- state-specific immutable candidate approval audit events;
- deterministic real-PostgreSQL/Spring/JDBC transaction coverage including controlled worker-failure rollback;
- documentation and fixtures that match the implemented direct-input worker and timestamp rules;
- removal of any public standalone `mark-generated` route reference;
- clear wording that worker/direct-input restrictions do not prohibit Microsoft Project recalculation in a later complete candidate.

V006 legacy history must remain readable, unversioned, unchanged, and frozen.

## Success criteria

### Exact candidate authority

- Every current-policy preview line is derived from an immutable authoritative candidate.
- The caller cannot override project, snapshot, imported task identity, field, captured baseline, normalized proposed value, source identity/version, fingerprint, or approval identity.
- Approval for candidate A cannot authorize candidate B.
- A newer candidate-bound approval event invalidates stale captured authority.
- Missing or ambiguous authority fails closed.
- Unsupported future policy versions fail closed.

### Value normalization

- `percent_complete` uses one canonical whole-number representation within 0–100.
- Proposed `actual_start` and `actual_finish` use the documented whole-second rule, preserve intended Project local wall-clock semantics, and require an explicit offset.
- Imported actual baselines retain available precision under the separate freshness canonicalizer.
- `physical_percent_complete` may remain readable historically/internal but is not eligible for the current direct-input worker.

### Baseline and task freshness

Before preview sealing, approval, and generation, verify that the accepted snapshot, imported task identity, leaf status, captured baseline, proposed value, source identity/version, field policy, and exact approval identity are still current.

Any failed line blocks the batch.

### Concurrency and lifecycle integrity

- No check-then-use race may allow stale input authority into generation.
- Lock acquisition follows one documented stable order.
- Worker failure rolls back database lifecycle changes and does not falsely mark a batch generated.
- Spring-managed rollback is proven through the real JDBC repository and PostgreSQL schema.
- Established lifecycle provenance cannot be rewritten.

### Historical compatibility

- V006 business rows are not rewritten, normalized, deduplicated, deleted, or assigned invented chronology.
- Historical physical-percent and duplicate rows remain readable.
- Legacy current-state restrictions remain enforced without rewriting history.
- Pre/post deterministic hashes over historical business columns match exactly.

### Direct-input worker and artifact boundary

Only these **direct input fields** may reach the current PR #48 worker:

- `percent_complete`
- `actual_start`
- `actual_finish`

The current worker must fail closed on unsupported/unknown fields, summary-task direct actuals, invalid/mismatched task identity, duplicate task/field inputs, invalid values, stale source facts, and request/generated-artifact mismatches.

This check proves that Shutdown Tracker did not inject unauthorized direct inputs into the pre-Project artifact. It does **not** prove or require that a later Microsoft Project-calculated candidate changes only those fields.

### Project-calculated candidate boundary

When manual or future automated Project-native calculation is performed:

- the accepted source/master remains unchanged;
- exact approved inputs are traceable into the calculation;
- Microsoft Project is allowed to recalculate dependent schedule state;
- differences are classified as `approved_input`, `project_calculated_consequence`, `planner_project_edit`, or `unexpected_difference`;
- a Project-calculated planned-date/duration/summary/work/slack change is not an automatic failure merely because Shutdown Tracker could not directly author that field;
- unexplained differences, wrong-task application, lost approved inputs, missing provenance, or source overwrite fail safe.

### Reproducible PostgreSQL evidence

The committed validation suite and CI must reproduce clean installation, populated V006-to-V007 preservation, candidate/approval/preview relationships, immutability, lifecycle metadata protection, deterministic concurrency, worker-failure rollback, real Spring/JDBC/PostgreSQL transaction behaviour, and intentional late-migration rollback.

## Documentation and pull-request accuracy

Documentation must distinguish:

1. execution/progress fact captured;
2. exact input candidate created;
3. input approved;
4. preview/approved-input set sealed;
5. current worker artifact generated;
6. complete updated candidate generated by the selected handoff mechanism;
7. Microsoft Project recalculated candidate;
8. source-versus-candidate delta reviewed;
9. candidate accepted/rejected/retained;
10. candidate adopted as next schedule or merged/imported into another schedule, if either occurs.

Evidence for one step must not be presented as proof of another.

## Non-goals for PR #48

Do not implement in this PR:

- a Shutdown Tracker CPM, critical-path, float, dependency, levelling, recovery, or optimisation engine;
- the complete-candidate generator if it is not already part of this branch;
- Microsoft Project COM/Interop automation or another desktop companion;
- unattended master overwrite or silent merge/import;
- server-side native `.mpp` writing;
- broad live task-progress, evidence, Problems, Handover, communications, or frontend feature expansion;
- authentication/authorization expansion, asynchronous queues, unrelated dependencies, or broad refactors.

These non-goals are PR-scope exclusions, not permanent product prohibitions. In particular, planner-controlled Microsoft Project recalculation and a separately reviewed Project-native companion remain valid product directions.

## Required validation

At minimum run from the repository root:

```text
git status -sb
git diff --check
mvn test
npm ci
npm test
npm run build
bash scripts/db/validate-migrations.sh
```

If the real Spring/PostgreSQL integration suite is not included in `mvn test`, run it explicitly. Record the final V007 SHA-256 whenever V007 changes.

Verify GitHub Actions on the exact final branch head. Do not treat an earlier green run as evidence for later commits.

Before completion, inspect the complete PR diff and confirm no secrets, real Project files, generated candidate/export artifacts, local database files, screenshots, IDE state, absolute developer paths, or temporary validation output are included.

## Safety constraints

- Preserve existing commits. Add new commits only for confirmed corrections or required authority/documentation updates.
- Do not amend, rebase, squash, rewrite history, or force-push.
- Push only `backend/enforce-export-integrity`.
- Keep PR #48 draft.
- Do not merge PR #48.
- Do not modify another worktree.
- Do not change machine execution policy or install global tooling without explicit approval.
- Do not commit generated artifacts, real schedules, customer/site data, local DB files, or secrets.

## Manual Microsoft Project gate

This goal does not authorize fabricating a manual Project result.

The manual gate must prove the handoff behaviour actually being claimed. At minimum it must record:

- the accepted synthetic source identity/hash;
- the exact approved direct inputs;
- the generated artifact/candidate identity/hash;
- Microsoft Project application/version/build;
- that the candidate opens/imports successfully;
- that the approved inputs apply to the intended leaf tasks;
- that Microsoft Project is allowed to perform its normal recalculation;
- the observed Project-calculated schedule consequences;
- any unexplained differences;
- that the accepted source/master remains unchanged;
- the planner decision.

Do **not** require “no schedule recalculation” as a pass condition. Recalculation is expected once Microsoft Project processes a complete updated candidate. The failure conditions are lost/altered approved inputs, wrong-task application, unexplained unsafe differences, missing provenance, or source/master overwrite.

Generated Project/XML files and screenshots remain outside Git; repository evidence is sanitized text only.

## Completion conditions

The automated portion of this goal is complete only when:

- the full PR diff has received end-to-end authority review;
- no unresolved material direct-input/export-lifecycle integrity defect remains;
- all required automated checks pass on the final head;
- PostgreSQL clean-install, populated-upgrade, concurrency, and rollback evidence passes;
- documentation and PR wording match the three-part authority model and current implementation;
- PR #48 remains draft;
- the branch is pushed without history rewriting;
- unrelated worktrees remain untouched;
- the remaining manual Project gate is reported precisely rather than being replaced by the old “no schedule changes” assumption.
