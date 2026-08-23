# ADR-010: Critical Work Package Reporting

Status: Draft

## Context

Operations teams need focused reporting for selected critical work without turning Shutdown Tracker into a critical-path engine or treating imported Microsoft Project criticality as application authority.

## Decision

Provide a Tier 1-only Console **Critical** page for reporting configuration and oversight. It does not calculate critical path, float, slack, schedule logic, or Critical membership. Microsoft Project Critical and slack values remain imported read-only schedule context; Tier 1 explicitly chooses what receives operational reporting.

The first approved UX exposes two source types:

1. a Tier 1-selected Project-critical executable leaf task; and
2. a Critical Work Pack sourced from one Tier 1-selected imported summary task plus all descendants.

The retained V006 Critical reporting schema can represent multiple summary sources. Preserve that schema compatibility, but treat multi-summary grouping as deferred and do not expose it in the first approved UX unless separately approved. Arbitrary manual leaf-task grouping is also deferred.

Each Critical item retains a current Tier 2 reporting assignment, reporting-assignment history, reporting mode, next report due, current operational condition, reporting state, submitted-report history, correction/supersession links, and audit provenance. Initial reporting modes are no recurring report, ad hoc, fixed interval, and fixed times.

Keep Project schedule context, operational condition, and reporting state separate. A change in one does not silently change another.

Tier 2 receives the formal reporting obligation through the assigned task or summary-work-pack view in the Mobile App. There is no separate Mobile Critical page. Tier 3 may see a Critical indicator on an assigned task but does not configure Critical reporting or own the formal report unless a later explicit decision expands that authority.

Submitted Critical reports are immutable. A correction creates a new report that explicitly supersedes the earlier submission.

## Consequences

- Critical Work Packages are not scheduling objects.
- Four-hour reporting is a configurable template, not a hardcoded behavior.
- Discussion, Delays / Problems, Actions, Evidence, History, and Critical reports remain contextual to the relevant task or summary-work-pack dashboard.
- A reporting assignment is explicit and is not inferred from Project Critical, WBS, discipline, contractor, Resource `Group`, operational category, or any other imported value.
- Critical reporting does not approve Project inputs, generate schedule changes, or alter the accepted Project snapshot.
- Future grouping options must remain generic and require a separately approved product decision before being exposed.
- V006 remains unchanged; this decision narrows product UX without rewriting migration history or claiming the workflow is implemented.
