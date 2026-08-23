# ADR-012: Product Trial Foundation and Project Export Deferral

Status: Accepted

## Context

The approved three-tier product model and two-client frontend direction were developed on a stack whose base also contained PR #48's exact candidate approval, sealed-preview, complete-source generation, browser acceptance workspace, and manual Microsoft Project round-trip gate.

Those technical controls answered one proposed export design, but they should not remain a prerequisite for validating the core operational product. The next evidence needed is whether Tier 1, Tier 2, and Tier 3 workflows correctly support assignments, task execution, progress, Today, Task Dashboard, and configurable Critical reporting.

## Decision

Establish the active product foundation directly from `main`, independent of PR #48.

The active foundation retains:

- exactly three application tiers and two separate clients;
- the task-centred operating model;
- system-timestamped Can't Start, Start, Pause, Resume, and Finish actions;
- end-of-shift field progress observations;
- versioned per-item Critical reporting policy;
- immutable imported Project sources and snapshots;
- read-only Project schedule context; and
- browser-only MSPDI/XML inspection as bounded import-review infrastructure.

The active foundation does **not** adopt the following as product requirements:

- exact candidate-bound approval;
- sealed preview or batch approval;
- a narrow `percent_complete` / `actual_start` / `actual_finish` product policy;
- complete-source candidate generation as the settled export design;
- the browser round-trip acceptance workspace;
- synthetic review-project bootstrap;
- Project-open/verification controls; or
- a mandatory real-human Microsoft Project round-trip gate before operational product trials.

The final Project export, recalculation, adoption, merge, and re-import contract is deferred until operational frontend trials provide evidence about the execution and progress facts that actually need to cross the boundary.

Microsoft Project remains schedule calculation and master-file authority. Shutdown Tracker still must not calculate CPM, invent schedule results, write native `.mpp`, or silently overwrite or merge into a master schedule.

Existing export-preview, approval, review-bootstrap, and MSPDI writer code already present on `main` is retained only as experimental technical infrastructure. Its presence does not make it current product authority or prove production readiness.

## Supersession

This ADR supersedes the active export/candidate requirements in ADR-001, ADR-006, ADR-007, and ADR-008. Those records remain useful technical history. Their durable no-independent-scheduler, immutable-source, and no-silent-master-write principles remain in force through this ADR and the primary product documents.

The earlier candidate-specific product documents remain in the repository as superseded technical research and are not delivery prerequisites.

## Consequences

- Product and frontend trial work can proceed directly from `main` without merging PR #48.
- Import inspection and immutable source/snapshot concepts remain useful independently of export design.
- No production task-execution backend is introduced by this decision.
- Export UI must state that the final contract is not yet finalised.
- Future export implementation requires a new bounded product decision, ADR, threat/failure review, and validation plan.
- Historic PRs and branches may remain available for reference without controlling the active delivery path.
