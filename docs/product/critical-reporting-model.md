# Critical Reporting Model

This document is primary product authority for Tier 1 Critical configuration and Tier 2 reporting obligations.

## Purpose and boundary

The Console **Critical** page is for reporting configuration and operational oversight. It does not calculate critical path, float, schedule logic, or Critical membership.

Microsoft Project `Critical`, Total Slack, Free Slack, and related calculated values remain imported read-only schedule context. Tier 1 explicitly selects the tasks or work packs that require operational reporting.

## Critical source types

The primary source types are:

1. **Selected Project-critical leaf task** — a Tier 1-selected imported executable leaf task, using Project-critical context as selection information rather than automatic membership.
2. **Critical Work Pack** — one Tier 1-selected imported summary task plus all descendants.

Selecting a summary as the structural source of a Critical Work Pack does not turn that summary into a tracked execution task. Execution and field-progress truth remain on executable descendant leaves; the work-pack view aggregates or reports over that context.

The first approved product UX exposes one summary task plus descendants for a Critical Work Pack. The existing V006 data foundation can represent multiple summary sources and must remain compatible, but multi-summary grouping is deferred and is not exposed in the first approved UX unless separately approved.

Arbitrary leaf-task grouping is not part of the first approved UX.

## Critical item contract

Each Critical item retains:

- selected source identity and immutable snapshot context;
- current Tier 2 reporting assignment;
- reporting-assignment history;
- current Critical Reporting Policy identity and version;
- template origin and item-level override provenance where applicable;
- configured timing mechanisms and triggers;
- required content selected from the supported-field catalogue;
- next report due;
- current operational condition;
- reporting state;
- immutable submitted-report history;
- correction and supersession links;
- audit provenance.

## Versioned Critical Reporting Policy

Tier 1 configures a versioned policy for each Critical item. The policy answers **who**, **when**, and **what** without creating a separate execution-state model.

### Who reports

The policy/assignment relationship identifies the current Tier 2 reporting owner. Reassignment is effective-dated and auditable; it does not rewrite responsibility for an earlier obligation or report.

### When reporting is required

Supported timing mechanisms include:

- no routine reporting;
- ad hoc or specifically requested reporting;
- fixed intervals;
- fixed times;
- shift-based reporting;
- event/exception-triggered reporting; and
- supported combinations of those mechanisms.

Event/exception context may include task/work-pack start, pause/block, resume, finish/completion, planned-finish exceedance, or a significant operational-condition change.

The reporting system must surface and reuse task facts it already knows. If an execution event already contains all structured information required by a matching reporting trigger, the policy must not make the Tier 2 owner enter a duplicate report. Any reuse or satisfaction of an obligation remains traceable to the source fact and policy version.

### What a report contains

Tier 1 selects required content from a controlled supported-field catalogue:

- completion/progress;
- operational condition;
- current position/focus;
- main delay/constraint;
- action/recovery;
- next target;
- forecast completion;
- resources/labour where configured;
- evidence/photo requirement; and
- comment/update text.

Known execution facts should be pre-populated. The Tier 2 owner supplies only the judgement or information that is not already present and still required by policy.

This controlled catalogue is not an arbitrary user-defined schema system. Critical configuration must not become a generic form builder.

## Reusable reporting templates

Reusable templates are starting configurations for a Critical Reporting Policy. Examples include:

- four-hour work-pack reporting;
- two-hour critical-task reporting;
- shift reporting; and
- exception-only reporting.

Examples are neither mandatory nor hardcoded to a job title or source type. Tier 1 may override a template for one Critical item. An item-level change creates that item's policy version; it must not silently mutate the reusable template, other items created from it, or earlier obligations/reports.

## One policy mechanism for both source types

Selected Project-critical leaf tasks and Critical Work Packs use the same policy mechanism and supported-field catalogue. Useful defaults may differ:

- a leaf task commonly reports progress, condition, constraint, forecast completion, and next target;
- a work pack commonly reports overall progress, descendant execution position, active work fronts, blocked work, main constraint, recovery, next milestone, and forecast completion.

These are defaults/examples, not separate hardcoded reporting systems.

Reporting assignment is explicit and independent of discipline, contractor, WBS, category, Resource `Group`, or Project-critical status.

## Keep execution, condition, and reporting separate

Do not collapse:

| Dimension | Meaning |
| --- | --- |
| Task execution truth | Underlying task events and field progress observations |
| Project schedule context | Imported Project-critical/slack/date context; read-only |
| Operational condition | Current field condition of the selected task/work pack |
| Reporting state | Whether a policy-bound obligation/report is due, satisfied, submitted, late, corrected, or otherwise in its workflow |

Changing one dimension does not silently change another. A late report does not change schedule criticality. A Project-critical value does not prove the work is blocked. A Critical report is a snapshot over execution truth, not a second source of task state. An execution event is not automatically a separately submitted Critical report, although a policy may traceably reuse its structured facts instead of requesting duplicate entry.

## Tier authority and application placement

Tier 1:

- creates, configures, archives, and oversees Critical items;
- selects the imported source;
- assigns the formal reporting obligation to Tier 2;
- selects a template or configures timing mechanisms, triggers, and required supported content;
- creates a new effective policy version when configuration changes; and
- reviews submitted-report history.

Tier 2 receives the formal reporting obligation through the assigned task or summary-work-pack view in the Mobile App. That context shows report due time/state, the applicable policy/template and required content, pre-populated known task facts, and fields that genuinely need Tier 2 input. Tier 2 submits reports only for Critical obligations explicitly assigned by Tier 1.

There is no separate Mobile Critical page. Critical reporting remains inside Assigned Tasks and Task Detail.

Tier 3 may see Critical context or an indicator on assigned work. Tier 3 does not configure Critical reporting or own the formal Tier 2 obligation by default.

## Immutability and corrections

A Critical Reporting Policy is versioned and effective-dated. Changing cadence, triggers, required content, or the reporting owner where represented by the policy/assignment relationship creates a new version/state; it does not rewrite an earlier policy, obligation, or report. Each obligation and submitted report retains the policy version under which it was generated so its meaning remains interpretable.

A submitted Critical report is immutable. A correction creates a new report that explicitly supersedes the earlier report. Reassignment, policy changes, due-time changes, reused task facts, and corrections preserve their earlier state and actor/time history.

Critical report review remains an operational reporting workflow. It does not approve Microsoft Project input, generate a schedule change, or update the accepted source/master.

## Existing schema boundary

The existing schema retains reporting-policy versions, cadence/required-field configuration, reporting periods, immutable updates, supersession, and shift/event/custom compatibility terms. `custom` is retained technical compatibility and does not authorise an arbitrary form builder.

The schema does not by itself prove the approved selected-leaf source, explicit Tier 2 owner, reusable-template/override behaviour, controlled field-catalogue enforcement, fact reuse, API, or UI workflow. V006 remains unchanged; future implementation must use additive migrations and separately reviewed contracts.
