# Next milestone — Local Execution Workspace v0

## Objective

Turn the current browser-local Microsoft Project interoperability lab into the first small usable Shutdown Tracker execution workspace without rebuilding the retired architecture or waiting for complete MSPDI progress semantics.

The milestone should be judged by a human-operable workflow, not by the number of Project fields, validators or compatibility cases implemented.

## Acceptance workflow

Using a real shutdown MSPDI/XML schedule held outside Git, a user can:

```text
import complete schedule
→ browse hierarchy and executable leaf tasks
→ select a task
→ record Tracker execution state / progress observation
→ see imported Project facts and Tracker-owned state separately
→ move between tasks without losing the local scenario
→ identify whether each observation is Project-exportable or local/intent-only
→ generate a separate candidate only for evidence-supported Project transactions
→ reset the scenario
→ export the complete current Tracker workspace/evidence state as JSON
```

For an evidence-supported completion, the optional flow continues:

```text
candidate XML
→ Microsoft Project open/recalculate/save
→ optional Project-result re-import and comparison
```

The Project round trip is an interoperability capability inside the workspace. It is not the definition of the product.

## Minimum product slices

### Slice 1 — Local schedule workspace

- complete MSPDI/XML import remains browser-local;
- immutable source bytes/hash remain retained;
- hierarchy and executable leaves are usable for navigation;
- selected task has a clear execution workspace;
- imported Project facts and Tracker state are visually distinct;
- scenario reset works.

### Slice 2 — Tracker execution state

- record the execution events/observations already represented by the local model;
- retain partial observations even when no Project write-back profile supports them;
- clearly label each retained state as either Project-exportable under a proven profile or local/intent-only;
- do not synthesize a Project mapping for unsupported observations.

### Slice 3 — Bounded Project handoff

- `assigned-completion-native-v0` remains available only inside its proven restrictions;
- unsupported tasks fail closed and remain otherwise usable in Tracker;
- source is never overwritten;
- candidate provenance is retained;
- result comparison is useful but must not require exhaustive validation of unrelated Project semantics before the workspace can operate.

### Slice 4 — Portable local state

Export one JSON document representing the current local workspace, including enough provenance to understand:

- imported source identity/hash;
- current Tracker events/observations;
- selected/changed task identities;
- exportability status/reason;
- generated candidate identity/hash when present;
- Project-result identity/hash when one has been reviewed.

This is prototype portability, not a production persistence contract.

## Explicitly not required for this milestone

The milestone must not be delayed to add:

- complete partial-progress MSPDI write-back;
- support for every assignment/timephased shape;
- every Project serialization invariant;
- backend/database/authentication;
- production Mobile/offline sync;
- broad roles/approvals;
- native MPP write support;
- automatic Project/COM operation;
- scheduling/CPM logic;
- Critical reporting, messaging or EAM integration;
- production-grade compatibility certification.

If one of these is later needed to make the local workflow useful, make that a new explicit product decision.

## Handling unsupported cases

Unsupported cases are expected in this prototype.

The default response is:

```text
Tracked locally — Project write-back not yet supported for this shape.
```

Only expand interoperability semantics when an unsupported case blocks the target workflow or a deliberate experiment is chosen to unlock it.

## PR #77 disposition

PR #77 has already produced decision-changing evidence:

- bounded completion composition worked across 13 real BOILER tasks;
- Microsoft Project accepted the candidate;
- the completions survived MPP save/close/reopen;
- the untouched control reproduced the unrelated Project XML→MPP normalization.

That evidence should be retained regardless of whether PR #77 itself merges.

The branch must not become an indefinite hardening programme. Remaining review findings should be triaged:

- **fix now** only when they can corrupt candidate generation, invalidate the tested native evidence, or create a materially false result in the intended reporting-cut workflow;
- **defer** generic race, presentation, metadata or semantic edge cases that are outside the current workflow and can fail closed;
- **reject** findings that would broaden the experiment beyond its declared evidence boundary without user value.

Do not block Local Execution Workspace v0 on PR #77 merge.

## Definition of forward progress

A PR advances this milestone when it makes the acceptance workflow more usable or reliable for a real schedule.

A PR that only increases the number of invariants, evidence fields, documentation pages or review gates does not advance the milestone unless it fixes a demonstrated blocker.
