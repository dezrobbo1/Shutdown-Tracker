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

Each Critical item retains a current Tier 2 reporting assignment, reporting-assignment history, versioned Critical Reporting Policy, next report due, current operational condition, reporting state, submitted-report history, correction/supersession links, and audit provenance.

Tier 1 configures who reports, when reporting is required, and what supported content is required. Timing mechanisms include no routine reporting, ad hoc/requested, fixed interval, fixed times, shift-based, event/exception-triggered, and supported combinations. Event/exception context may include start, pause/block, resume, finish/completion, planned-finish exceedance, and significant condition change.

Required content is selected from a controlled catalogue: completion/progress, operational condition, current position/focus, main delay/constraint, action/recovery, next target, forecast completion, resources/labour where configured, evidence/photo requirement, and comment/update text. The product does not provide arbitrary user-defined field schemas or a generic form builder.

Known execution facts are surfaced and reused. A policy must not demand duplicate entry when a matching execution event already contains the required structured information; reuse remains traceable to the source fact and policy version. Critical reports remain snapshots over underlying execution truth rather than a second task-state model.

Reusable reporting templates are starting configurations. Four-hour work-pack, two-hour critical-task, shift, and exception-only policies are examples, not mandatory systems. Tier 1 may override an item without silently mutating its template or other items. Selected leaf tasks and Critical Work Packs use the same policy mechanism and catalogue, with different useful defaults rather than separate hardcoded report systems.

Keep Project schedule context, operational condition, and reporting state separate. A change in one does not silently change another.

Tier 2 receives the formal reporting obligation through the assigned task or summary-work-pack view in the Mobile App. The contextual view shows due state/time, policy/template, supported required content, pre-populated known facts, and only the fields that need Tier 2 judgement/input. There is no separate Mobile Critical page. Tier 3 may see Critical context on assigned work but does not configure reporting or own the formal Tier 2 obligation by default.

Cadence, trigger, required-content, and owner changes create a new effective policy/assignment version. Earlier obligations and reports retain the version that generated them. Submitted Critical reports are immutable; a correction creates a new report that explicitly supersedes the earlier submission.

## Consequences

- Critical Work Packages are not scheduling objects.
- Reporting timing may combine supported interval, time, shift, request, and event/exception mechanisms.
- Reporting content comes from a controlled catalogue, not a generic form builder.
- Four-hour reporting is one configurable template example, not hardcoded behavior.
- An item-level override does not mutate a reusable template or sibling items.
- Task facts should be reused rather than entered again solely to satisfy a reporting trigger.
- Discussion, Delays / Problems, Actions, Evidence, History, and Critical reports remain contextual to the relevant task or summary-work-pack dashboard.
- A reporting assignment is explicit and is not inferred from Project Critical, WBS, discipline, contractor, Resource `Group`, operational category, or any other imported value.
- Critical reporting does not approve Project inputs, generate schedule changes, or alter the accepted Project snapshot.
- Future grouping options must remain generic and require a separately approved product decision before being exposed.
- Existing policy-version/cadence/required-field/period/supersession compatibility is retained. `custom` compatibility does not authorise arbitrary form construction.
- V006 remains unchanged; this decision defines product UX without rewriting migration history or claiming the workflow is implemented.
