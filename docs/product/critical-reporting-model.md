# Critical Reporting Model

This document is primary product authority for Tier 1 Critical configuration and Tier 2 reporting obligations.

## Purpose and boundary

The Console **Critical** page is for reporting configuration and operational oversight. It does not calculate critical path, float, schedule logic, or Critical membership.

Microsoft Project `Critical`, Total Slack, Free Slack, and related calculated values remain imported read-only schedule context. Tier 1 explicitly selects the tasks or work packs that require operational reporting.

## Critical source types

The primary source types are:

1. **Selected Project-critical leaf task** — a Tier 1-selected imported executable leaf task, using Project-critical context as selection information rather than automatic membership.
2. **Critical Work Pack** — one Tier 1-selected imported summary task plus all descendants.

The first approved product UX exposes one summary task plus descendants for a Critical Work Pack. The existing V006 data foundation can represent multiple summary sources and must remain compatible, but multi-summary grouping is deferred and is not exposed in the first approved UX unless separately approved.

Arbitrary leaf-task grouping is not part of the first approved UX.

## Critical item contract

Each Critical item retains:

- selected source identity and immutable snapshot context;
- current Tier 2 reporting assignment;
- reporting-assignment history;
- reporting mode;
- next report due;
- current operational condition;
- reporting state;
- immutable submitted-report history;
- correction and supersession links;
- audit provenance.

Initial reporting modes are:

- no recurring report;
- ad hoc;
- fixed interval;
- fixed times.

Reporting assignment is explicit and independent of discipline, contractor, WBS, category, Resource `Group`, or Project-critical status.

## Keep three dimensions separate

Do not collapse:

| Dimension | Meaning |
| --- | --- |
| Project schedule context | Imported Project-critical/slack/date context; read-only |
| Operational condition | Current field condition of the selected task/work pack |
| Reporting state | Whether a report is due, submitted, late, corrected, or otherwise in its reporting workflow |

Changing one dimension does not silently change another. A late report does not change schedule criticality. A Project-critical value does not prove the work is blocked. A task execution event is not itself a submitted Critical report.

## Tier authority and application placement

Tier 1:

- creates, configures, archives, and oversees Critical items;
- selects the imported source;
- assigns the formal reporting obligation to Tier 2;
- changes reporting mode or assignment with audit history;
- reviews submitted-report history.

Tier 2 receives the formal reporting obligation through the assigned task or summary-work-pack view in the Mobile App. Tier 2 submits reports only for Critical obligations explicitly assigned by Tier 1.

There is no separate Mobile Critical page. Critical reporting remains inside Assigned Tasks and Task Detail.

Tier 3 may see a Critical indicator on an assigned task. Tier 3 does not configure Critical reporting or own the formal report unless a later explicit product decision expands that authority.

## Immutability and corrections

A submitted Critical report is immutable. A correction creates a new report that explicitly supersedes the earlier report. Reassignment, reporting-policy changes, due-time changes, and corrections preserve their earlier state and actor/time history.

Critical report review remains an operational reporting workflow. It does not approve Microsoft Project input, generate a schedule change, or update the accepted source/master.

## Existing schema boundary

The V006 Critical reporting foundation is retained unchanged. This product authority narrows the first approved UX without rewriting migration history or claiming runtime behaviour that is not verified in the repository.
