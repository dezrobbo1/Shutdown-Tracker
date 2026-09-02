# Shutdown Tracker working mode

## Purpose

Build Shutdown Tracker through small, runnable product slices over real Microsoft Project schedules while keeping Project write-back strictly evidence-based.

The repository must not drift back into architecture-first delivery, exhaustive compatibility work, or repeated hardening/review loops that do not improve the current user workflow.

## Current milestone — Local Execution Workspace v0

A user should be able to import a complete MSPDI/XML schedule locally, browse hierarchy and executable tasks, record Tracker-owned execution state/observations, reset the scenario, export Tracker state/evidence as JSON, and generate Project XML only for transaction shapes that are already native-evidence-supported.

Partial progress or another unsupported Project mapping may still be recorded in Tracker. It remains local/intent-only until the corresponding Project transaction is proven.

## Core rules

- Never overwrite the imported source. Always generate a separate candidate.
- Target Project tasks by UID and verify task identity before patching.
- Do not invent Microsoft Project XML semantics. Native Microsoft Project-authored evidence overrides assumptions, prior code and documentation.
- A file opening successfully is not proof of semantic correctness.
- Every Project export profile must be labelled as baseline, diagnostic or native-evidence-derived.
- Project write-back must fail closed outside the proven profile boundary.
- Unsupported Project write-back is **not** a blocker to Tracker-owned local execution capture.
- Preserve source/candidate/result/execution-intent provenance for interoperability experiments.
- Real customer schedules and generated trial artifacts remain outside Git.
- Keep the active tree small. Add infrastructure only when the current product slice demonstrates a concrete need.

## Forward-progress test

Before starting substantial work, identify which of these it does:

1. adds a user-visible capability to the current milestone;
2. tests an idea whose result changes the next implementation decision;
3. fixes a defect that blocks, corrupts or materially misrepresents the current milestone; or
4. removes complexity that is preventing delivery.

If none applies, defer the work.

Research, tests, documentation, refactoring, compatibility work and hardening are supporting activities, not progress by themselves.

## Edge-case rule

When a new edge case appears:

- fix it now if it can corrupt source/candidate data, lose user state, falsely claim a tested result, or blocks the current target workflow;
- otherwise fail closed, label it unsupported, and defer it;
- do not broaden a bounded experiment merely to satisfy every theoretically possible MSPDI shape;
- do not turn a discovered unsupported case into a new semantic phase unless the user explicitly chooses that direction.

A useful bounded capability with visible unsupported states is preferable to an indefinitely hardened capability that never becomes usable.

## Automated review rule

Automated review, including Codex, is advisory during prototype development.

For each meaningful capability change:

- normally run one serious automated review pass;
- classify findings as **fix now**, **defer**, or **reject** against the current milestone and evidence claim;
- fix-now findings are those that can invalidate the current experiment, corrupt user/source data, create a false success state, or directly block the milestone;
- defer findings that concern unexercised edge cases or future production robustness;
- do not enter repeated clean-review loops just because a fresh review can always identify another possible invariant;
- request another review only when the fixes materially changed the capability or the user explicitly asks for it.

Review completion is not itself a product milestone.

## Interoperability evidence rule

Run native Microsoft Project experiments only when they unlock or falsify a concrete product behaviour or export claim.

Do not make wider product development wait for unrelated native semantics. In particular:

- completion write-back may use the already proven bounded profile;
- partial progress may be tracked locally before partial-progress Project write-back is proven;
- unsupported task shapes should remain visibly unsupported rather than triggering automatic compatibility expansion.

## PR #77 boundary

PR #77 contains useful bulk-completion evidence, but it is not on the critical path for product development.

Do not keep expanding PR #77 solely to close theoretical validation gaps. Classify remaining findings against the tested 13-task evidence and the actual reporting-cut workflow. It is acceptable to defer issues or leave the PR unmerged if merging would require disproportionate hardening. The native evidence remains useful even if the branch is retained as an experiment.

## Deliberate current exclusions

Do not introduce the following unless explicitly required by the current milestone or approved by the user:

- production backend/database/authentication;
- production roles/approval lifecycle;
- production Mobile/offline architecture;
- Critical reporting or messaging systems;
- CPM/scheduling-engine ownership;
- native MPP writing;
- automatic Microsoft Project control;
- broad compatibility certification;
- speculative future-proofing infrastructure.

These are future product decisions, not prerequisites for the local execution workspace.

## Validation

For ordinary changes run the smallest relevant validation set, normally:

```text
npm run check
npm test
npm run build
git diff --check
```

Add focused tests for the capability being changed. Do not expand validation scope solely to create more gates.
