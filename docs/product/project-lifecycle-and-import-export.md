# Project Lifecycle and Import / Export

This document is primary product authority for Projects Home, project lifecycle, Project import, the deferred export boundary, and retention.

## Lifecycle

```text
Draft -> Active -> Closed -> Archived
```

### Draft

Draft supports project setup, source import, Operational Mapping, membership, assignments, and configuration. Normal Mobile execution is unavailable.

### Active

Active enables full live execution in the Console and Mobile App according to tier and explicit assignment.

### Closed

Closed stops routine Mobile execution. Tier 1 may continue final review, reporting, import/export history review, and close-out. A closed project may be reopened, with the lifecycle change audited.

### Archived

Archived is read-only except for the Tier 1 **Restore** action and is hidden from the default project list. Archive is the normal retention path. Restore returns the project to Closed while preserving its full identity and history.

## Project deletion and reset boundaries

Permanent deletion is limited to an eligible empty draft/test project with no accepted snapshot, no operational history, and no audit history beyond the permitted creation/setup and deletion-eligibility events needed to prove that boundary.

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
3. **Export** — an explicit not-finalised surface for the Project export/round-trip design that will follow operational trials;
4. **History** — immutable imports, snapshots, corrections, and audit, plus any future export history once a new contract is approved.

## Import flow

```text
select source
-> validate
-> parse
-> inspect
-> validate Operational Mapping
-> compare to current snapshot
-> reconcile important lineage
-> accept new immutable snapshot
-> activate
```

Every accepted source and snapshot is immutable. A new import creates a new snapshot identity. Re-import must not silently overwrite active Tracker execution history, silently remap uncertain source fields, or silently rebind prior task and operational records.

Tier 1 may reject an import before acceptance. Rejection preserves required audit/provenance without activating the proposed snapshot.

## Export direction

The final Project export/round-trip contract is intentionally not finalised on the product-trial foundation.

Operational trials must first establish:

- which Tracker execution and progress facts are useful to Tier 1;
- which facts need review or correction;
- which Project fields, if any, should receive those facts;
- how Project recalculation consequences should be reviewed; and
- how a later Project result should return as a new immutable snapshot.

The explicitly flagged [Tier 1 Project Round-Trip Trial](tier1-project-roundtrip-trial.md) gathers evidence for those decisions without changing this authority. It retains the original UTF-8 source bytes and losslessly decoded text in browser memory, lets Tier 1 review optional Tracker-to-Project field proposals, creates a separate source-preserving experimental XML candidate, and guides a manual Microsoft Project step plus conservative local result comparison. It has no production approval/adoption lifecycle, backend persistence, native `.mpp`, or automatic Project recalculation.

Existing export preview, approval, review-bootstrap, and minimal MSPDI writer code on `main` is experimental technical infrastructure. It does not establish exact candidate-bound approval, sealed preview, a narrow direct-input product policy, complete-source generation, or a mandatory manual round-trip gate as current requirements.

Until a replacement contract is approved:

- Export remains visibly **not finalised** in the Console;
- no production-looking candidate or approval controls are enabled outside an explicitly labelled browser-local evidence trial;
- Microsoft Project remains schedule calculation and master-file authority;
- Shutdown Tracker does not calculate CPM or write native `.mpp`; and
- Shutdown Tracker never silently saves, overwrites, or merges into a master schedule.

See [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md) and the [Trial Foundation Retention Map](trial-foundation-retention-map.md).
