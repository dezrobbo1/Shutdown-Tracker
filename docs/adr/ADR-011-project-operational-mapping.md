# ADR-011: Project Operational Mapping

Status: Draft

## Context

Real Microsoft Project schedules use different planning conventions for operational classification. A task may be classified by a custom task field such as `Text30 / Assigned Department`, by WBS or summary-task hierarchy, or indirectly through assigned resources and the standard Resource `Group` field. The same conceptual label cannot be assumed to live in the same Project field across sites, contractors, or shutdown templates.

Shutdown Tracker needs those Project-derived classifications for filtering, grouping, display, Saved Views, Today, Critical selection, reporting, and bulk Tier 2 assignment selection without hardcoding one customer's Project template or taking ownership of schedule calculation.

Imported classifications cannot determine application authority. Tier 1 has whole-project Console authority. Tier 2 and Tier 3 Mobile access comes only from active project membership and explicit saved assignments.

## Decision

Introduce a configurable **Project Operational Mapping** layer between immutable imported Project snapshots and Shutdown Tracker execution features.

Microsoft Project remains the owner of imported source facts, structure, resource/assignment relationships, and custom-field values. Shutdown Tracker owns only the explicit operational interpretation configured over those facts.

The initial mapping model supports:

1. direct imported task fields/custom fields;
2. WBS/hierarchy/selected summary-task ancestry;
3. task assignments resolved through the assigned resource's standard Project `Group` field.

Tier 1-configured Operational Categories may be single- or multi-valued. They may feed filters, grouping, display context, Saved Views, Today, Critical selection, reporting, related operational-record context, and bulk selection before Tier 1 creates explicit Tier 2 tracking assignments.

A bulk-assignment action must create ordinary explicit assignment records with actor/time, task identity, assignee, assignment history, and audit provenance. Category membership does not itself create, retain, or revoke an assignment.

Original imported source values are immutable. Tracker display aliases and higher-level operational roll-ups are stored separately.

Mapping definitions live in versioned Import Profiles and are revalidated against every new immutable Project snapshot. Missing/changed sources, new values, hierarchy changes, and probable field moves are surfaced for review. Uncertain mappings are never silently remapped.

Project-derived category membership is not application authorisation. Saved explicit assignments, active membership tier, and the Tier 2-to-Tier 3 direct-report relationship determine Tier 2/Tier 3 access. Category membership, responsibility labels, Project custom fields, WBS, Resource `Group`, and Critical membership do not grant update, review, reporting, or export authority.

## Consequences

- Shutdown Tracker can support different Microsoft Project templates without bespoke code for each site's field conventions.
- Resource-derived classifications must support multiple values because one task may have assignments from multiple Resource Groups.
- Formula-backed Project custom fields may be consumed as evaluated read-only classification values, but Shutdown Tracker does not implement the Project formula engine.
- Hierarchy-derived categories require explicit structural configuration rather than assuming one universal OutlineLevel meaning.
- Discussion, Delays / Problems, Actions, Evidence, History, and related task-owned operational records can retain historical mapped-category context while current classification is resolved from the active snapshot.
- Mapping provenance must be retained so users can determine why a task belongs to a category.
- Mapping, profile, value-alias, and category changes require audit history.
- Bulk Tier 2 assignment may use mapped categories as a selection aid, but the resulting explicit assignment records remain the access authority.
- Operational Mapping does not grant permission to calculate CPM, critical path, float, resource levelling, schedule optimisation, date movement, Project formula evaluation, or automatic Project write-back.

## MVP boundary

MVP includes Source Catalogue discovery, Operational Categories, the three initial source modes, single/multi-value membership, aliases/roll-ups, filters, grouping, Saved Views, versioned Import Profiles, re-import mapping health, execution-readiness checks, provenance, and audit.

Complex expression/rules engines, advanced assignment custom-field derivation, category-driven automatic assignment or authority, milestone event watch, baseline analysis, and advanced Project schedule-context analysis are deferred.
