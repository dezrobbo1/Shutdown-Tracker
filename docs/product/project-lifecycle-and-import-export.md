# Project Lifecycle and Import / Export

This document is primary product authority for Projects Home, project lifecycle, Project import, candidate export, and retention.

## Lifecycle

```text
Draft -> Active -> Closed -> Archived
```

### Draft

Draft supports project setup, source import, Operational Mapping, membership, assignments, and configuration. Normal Mobile execution is unavailable.

### Active

Active enables full live execution in the Console and Mobile App according to tier and explicit assignment.

### Closed

Closed stops routine Mobile execution. Tier 1 may continue final review, reporting, candidate export, Microsoft Project verification, and close-out. A closed project may be reopened, with the lifecycle change audited.

### Archived

Archived is read-only and hidden from the default project list. Archive is the normal retention path. Archive is reversible through Restore; restoration preserves the project's full identity and history.

## Project deletion and reset boundaries

Permanent deletion is limited to an eligible empty draft/test project with no accepted snapshot and no operational or audit history.

There is no generic production **Clear Project** command. Use specific operations:

- Reset view;
- Reject import;
- Import new snapshot;
- Close project;
- Archive project;
- Restore project;
- Create fresh test project;
- Delete eligible empty draft/test project.

Reset view changes presentation state only. Starting a fresh test project creates a new project identity rather than deleting append-only evidence from an existing project.

## Flexible setup and activation readiness

Project setup order is flexible. The product must not force one rigid wizard when the required facts can be completed safely in another order.

Activation requires all of these readiness checks:

- an accepted Microsoft Project snapshot;
- required Operational Mappings valid;
- at least one active Tier 1 project member;
- timezone configured;
- operational-day start configured.

Activation records the readiness result and actor/time. A missing check blocks activation without deleting draft work.

## Import / Export structure

The Console **Import / Export** section contains:

1. **Current Schedule** — accepted snapshot/source identity, status, provenance, and mapping health;
2. **Import** — source selection, validation, review, comparison, lineage reconciliation, and acceptance;
3. **Export** — exact Project-input review, sealed candidate preparation, artifact generation, and Microsoft Project verification/disposition;
4. **History** — immutable imports, snapshots, candidates, decisions, corrections, adoption/merge provenance, and audit.

## Import flow

```text
select source
-> validate
-> parse
-> inspect
-> validate Operational Mapping
-> compare to current snapshot
-> reconcile important lineage
-> accept and activate new immutable snapshot
```

Every accepted source and snapshot is immutable. A new import creates a new snapshot identity. Re-import must not silently overwrite active Tracker execution history, silently remap uncertain source fields, or silently rebind old input candidates.

The Microsoft Project operator may reject an import before acceptance. Rejection preserves required audit/provenance without activating the proposed snapshot.

## Export and Microsoft Project handoff

```text
execution facts
-> proposed Project inputs
-> Tier 1 review
-> approved exact inputs
-> complete candidate MSPDI/XML
-> Microsoft Project opens and recalculates
-> Tier 1 reviews result
-> reject / retain / adopt / merge
-> adopted or merged result re-imported as a new snapshot
```

The Tier 1 schedule owner or Microsoft Project operator performs the external Microsoft Project activity. This does not create another application role.

Tier 1 approval binds exact source snapshot, task, field, value, candidate identity, and approval evidence. It does not approve guessed consequences and does not update the accepted master.

Candidate generation produces a separate complete-source candidate. Microsoft Project remains calculation authority and may recalculate planned dates, durations, roll-ups, work, assignments, timephased data, slack, criticality, and related consequences. Tier 1 reviews those as Microsoft Project-calculated consequences.

The result may be:

- rejected;
- retained for further review;
- adopted as the next controlled schedule; or
- merged/imported into another schedule through Microsoft Project.

Adoption and merge/import are separate, auditable dispositions. Any adopted or merged result enters Shutdown Tracker only through a new import and immutable snapshot. The source/master is never silently overwritten.

## Integrity and manual gate

The PR #48 handoff boundary remains unchanged:

- immutable accepted source and snapshot identity;
- exact candidate-bound approval;
- sealed preview membership;
- generation-time freshness and policy checks;
- complete-source MSPDI/XML candidate generation;
- separate candidate identity and hash;
- manual Microsoft Project open/recalculation/review;
- explicit rejection, retention, adoption, or merge disposition;
- append-only audit and correction/supersession history.

The manual real-human Microsoft Project round-trip gate remains required. Documentation or browser review alone does not satisfy that gate.

Shutdown Tracker does not calculate CPM, write native `.mpp`, silently save a master, or silently merge a candidate.
