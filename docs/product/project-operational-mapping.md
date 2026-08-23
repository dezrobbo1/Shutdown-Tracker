# Project Operational Mapping

## Purpose

Project Operational Mapping defines how Tier 1 turns imported Microsoft Project structure and classifications into Shutdown Tracker operational categories, filter context, views, bulk-assignment aids, and reporting context without turning Shutdown Tracker into a scheduler.

The governing rule is:

> Microsoft Project supplies source facts and classifications. Shutdown Tracker lets Tier 1 decide how those facts are interpreted operationally.

Imported Project values remain immutable source facts. Tracker configuration may add labels, groupings, filter context, saved views, reporting context, and bulk-assignment previews, but it must not silently rewrite or reinterpret the Project source.

## Product boundary

Project Operational Mapping is **safe execution configuration**. It may classify, filter, group, report, support saved views, and assist explicit bulk Tier 2 assignment.

It must not:

- calculate CPM, critical path, or float;
- resource-level or optimise the schedule;
- recalculate Project formulas;
- move dates or alter predecessors, constraints, calendars, baselines, or schedule logic;
- silently write changes to Microsoft Project;
- write native `.mpp` files;
- infer application permissions solely from Project classifications.

Project schedule fields such as planned dates, Project Critical, slack, constraints, calendars, deadlines, and baselines may later be displayed as read-only Project context where explicitly approved. They do not become Tracker scheduling logic.

## Source Catalogue

After each Project snapshot is imported, Shutdown Tracker should expose a read-only Source Catalogue showing the sources that are actually present and populated.

For each candidate source, show enough information for Tier 1 to make an informed mapping decision, including where applicable:

- source entity: Task, Resource, or Assignment;
- Project field and custom-field alias;
- field/value type;
- whether the source is formula-derived or lookup-controlled;
- population/coverage;
- distinct-value count and representative sample values;
- current Operational Category mapping;
- mapping health.

Discovery must inspect both configured custom-field definitions and fields actually populated on imported entities. A useful populated field must not disappear from the catalogue merely because the Project file lacks a friendly custom-field configuration entry.

## Operational Categories

An Operational Category is a Tracker-owned configuration object backed by Project-derived source data.

Examples include:

- Assigned Department;
- Work Group;
- Area;
- Contractor;
- Day;
- Work Package;
- Workstream;
- System / Subsystem;
- Equipment;
- Responsible Team.

These names are examples, not a hardcoded universal taxonomy. Different Project templates may use different fields and terminology.

An Operational Category should define at least:

- display name and optional description;
- source type and source definition;
- single- or multi-value cardinality;
- filter/group/Scope eligibility, where Scope means query context only;
- Saved View eligibility;
- Critical selection/reporting/mobile display relevance where approved;
- null/unmapped behavior;
- optional value aliases and higher-level roll-ups;
- re-import validation policy.

## MVP source modes

### 1. Direct task field

A category may map directly to an appropriate imported task field, including supported custom fields / ExtendedAttributes.

Example:

```text
Operational Category: Assigned Department
Source: Task -> Text30
Project alias: Assigned Department
Source value: W4M1
```

The mapping must preserve the source field identity and imported source value.

### 2. Task hierarchy / WBS / summary ancestry

A category may be derived from Project structure. Tier 1 should be able to select structural anchors or an appropriate hierarchy rule and preview the resulting membership before activation.

Do not assume a universal rule such as `OutlineLevel = 3 means Work Package`. Real schedules vary in depth and meaning.

Examples:

- Area from selected WBS/summary branches;
- Work Package from selected summary-task ancestry;
- Equipment from a selected parent structure.

The derivation definition must be versioned so it can be revalidated when hierarchy changes.

### 3. Assigned resource -> Resource.Group

A task category may be derived through task assignments to the standard Microsoft Project Resource `Group` field.

Example:

```text
Operational Category: Work Group
Source: Task -> Assignments -> Resource.Group
Values: CVM MECH, CVM REF, CVM SCAF
```

This source is inherently multi-valued. A task assigned resources from more than one Resource Group must retain all resolved values rather than choosing one arbitrarily.

The standard Project `WorkGroup` resource field is not to be treated as an industrial work-group classification; the mapping source described here is Resource `Group`.

## Source value, display alias, and operational roll-up

The model must keep three concepts separate:

```text
Project source value -> optional Tracker display alias -> optional Tracker operational parent
```

Example:

```text
WCG-GCS -> General Cranes -> Contractors
```

or:

```text
W3M1
W4M1  -> Mechanical
W5M1
```

Changing a display label or roll-up must never change the imported source value.

Shutdown Tracker must not infer code meaning automatically. A code such as `W4M1` remains `W4M1` unless Tier 1 explicitly configures a display interpretation.

## Formula and lookup-backed fields

Project formula-backed fields may be useful operational dimensions, for example a Project `Day` field. Shutdown Tracker may import and use the evaluated value for filtering, grouping, query-only Scope, and Saved Views.

It must not implement or reproduce the Project formula engine.

Formula-derived values should normally be treated as current Project context rather than permanent cross-snapshot identity because legitimate Project recalculation may change them.

Project lookup-table metadata should be retained as source metadata. Tracker aliases and roll-ups remain separate from the Project-controlled lookup value.

## Operational Scope as filter context

Operational Categories may feed a coherent Scope filter model.

Examples:

```text
Whole shutdown
```

```text
Assigned Department = W4M1
```

```text
Work Group = CVM REF
Area = Calciner
```

Where appropriate, Scope may filter:

- Today;
- Critical selection and reporting;
- Tasks;
- task-owned Delays / Problems;
- task-owned Actions;
- task-owned Evidence;
- task-owned History and handover context;
- operational counts;
- execution reports.

Scope is presentation/query context, never application authority. It does not restrict Tier 1 whole-project access, widen Tier 2/Tier 3 assigned-task access, or create an assignment. Mobile results remain bounded by explicit assignment even when a broader filter matches.

## Saved Operational Views

Saved Views should reuse the same scope/filter model rather than create a second rules system.

A Saved View may persist:

- operational Scope;
- mapped-category filters;
- Tracker execution/problem/review filters;
- grouping and sorting;
- visible columns;
- time window;
- Critical reporting selection/filtering where applicable.

Views may be private, project-shared, or tier-default. A Saved View changes presentation only and never grants authority.

The initial rule capability should remain deliberately simple: AND across filter dimensions with multi-select/OR within one dimension. Do not introduce arbitrary scripting, schedule expressions, predecessor logic, or formula evaluation.

## Critical reporting integration

Project Operational Mapping may assist Tier 1 in selecting Critical reporting items using:

- selected summary branches;
- WBS/hierarchy structure;
- mapped Operational Categories for search/filtering;
- simple Saved View/filter definitions where later approved.

The first approved Critical Work Pack UX selects one imported summary task plus descendants. A selected Project-critical leaf task is the other primary source. Multi-summary grouping remains compatible with V006 but is deferred from the first approved UX.

Critical reporting remains an app-owned execution-reporting construct. Microsoft Project `Critical`, Total Slack, Free Slack, or other schedule-calculated values do not automatically define membership.

## Assignment assistance and authority

Project classification and application authority are separate.

A mapping or saved filter may help Tier 1 select a task set for bulk Tier 2 assignment. The preview is only a selection aid. Authority begins only when explicit assignment records are saved under [User Tier and Assignment Model](user-tier-and-assignment-model.md).

Category membership is never a dynamic grant. It cannot create, widen, or revoke task visibility, update authority, reporting responsibility, Project-input authority, export authority, or administration authority.

Tier 2/Tier 3 access remains determined by active project membership, the Tier 2-to-Tier 3 direct-report relationship, and saved task/reporting assignments.

## Operational-record category context

Problems, Actions, Evidence, Handover, Critical Updates, and similar records linked to a task/WP should be discoverable through the relevant mapped operational categories without requiring repeated manual tagging.

For auditability, retain historical category context at the time the operational record is created or materially linked, while also allowing the UI to resolve current classification from the active Project snapshot.

This supports both questions:

- Which team/area did this record belong to when it was raised?
- Which team/area owns the associated work now?

## Import Profiles

An Import Profile is the reusable, versioned container for Project Operational Mapping conventions.

A profile may contain:

- category source mappings;
- expected Project field identity/alias/type;
- hierarchy derivation definitions;
- Resource Group derivations;
- value configuration/aliases/roll-ups;
- default filters/Scope dimensions;
- Critical WP candidate/structural rules where approved;
- execution-readiness/data-quality rules.

A profile contains mapping definitions, not mutable copies of Project source values.

Project-level overrides must be explicit and versioned.

## Re-import and mapping health

Every imported Project file becomes a new immutable snapshot. Active mappings must be revalidated against every new snapshot.

Validation must cover at least:

- expected source still present;
- alias/type/configuration changes;
- source field moved to another custom-field slot;
- new or disappearing source values;
- hierarchy/WBS changes;
- resource/group changes;
- profile/template mismatch.

Recommended mapping states:

- Healthy;
- Healthy - new values;
- Warning - source configuration changed;
- Confirmation required;
- Broken;
- Orphaned values;
- Profile mismatch.

If a probable replacement field is detected, Shutdown Tracker may present evidence and a proposed remap for Tier 1 review. It must not silently activate that remap when identity is uncertain.

Value aliases/configuration for values absent from the current snapshot should remain available for historical records and future reappearance rather than being automatically deleted.

## Execution-readiness checks

The mapping layer should support Tier 1-configured data-quality checks needed for execution readiness, for example:

- executable leaf tasks require Assigned Department;
- Critical WP descendants require Work Group;
- tasks starting in the active execution window require an operational owner where policy requires it;
- contractor work must resolve to a known configured classification;
- required Work Order values are missing;
- unexpected new category values require Tier 1 review.

These checks validate operational data readiness. They must not become CPM, schedule-quality, or recovery-schedule analysis.

## Provenance

Every resolved category membership should be explainable.

For a direct mapping, provenance identifies the snapshot, task, Project field, and source value.

For a resource-derived category, provenance should be able to trace:

```text
Task -> Assignment -> Resource -> Resource.Group -> resolved category value
```

For hierarchy-derived categories, provenance identifies the structural rule/anchor and relevant task ancestry.

The Tier 1-facing product should ultimately be able to answer: **Why is this task in this category?**

## Audit requirements

Audit at least:

- category created/changed/retired;
- source mapping created/changed/removed;
- value alias/roll-up changed;
- Import Profile version created/activated;
- mapping confirmation/remap accepted;
- validation warning overridden;
- shared Saved View changed;
- a bulk Tier 2 assignment selection is committed from mapped/filter context;
- a Critical definition changes where mapping is involved.

Audit records should preserve actor, time, project, relevant snapshot/profile version, and before/after configuration where appropriate.

## Tier use

- **Tier 1:** inspect Project source data; create/edit Operational Categories; create/version Import Profiles; confirm remapping; configure aliases/roll-ups; activate mappings; use Scope/Saved Views across the whole project; and commit explicit bulk Tier 2 assignments.
- **Tier 2:** see mapped values only as display/filter context on explicitly assigned tasks. Mapped values do not widen access or permit mapping administration.
- **Tier 3:** see mapped values only as display context on explicitly assigned tasks. Mapped values do not widen access or permit mapping administration.

## MVP

The minimum useful Project Operational Mapping capability includes:

- Source Catalogue for relevant imported task/custom fields, hierarchy, and Resource Group;
- Operational Category creation;
- direct task-field mapping;
- hierarchy/summary-ancestry mapping;
- assigned-resource `Group` mapping;
- single- and multi-value task membership;
- distinct-value/coverage preview;
- optional display aliases and higher-level roll-ups;
- category use in filtering/grouping/query-only Scope;
- Saved Operational Views;
- reusable versioned Import Profiles;
- mapping-health/re-import validation;
- execution-readiness checks;
- historical category context/provenance;
- audit of configuration changes.

## Deferred

Defer until the foundation is proven:

- arbitrary complex rules/expression language;
- advanced assignment custom-field derivation;
- automatic Tier 2/Tier 3 authority from classifications;
- milestone/event watch;
- baseline analysis;
- calendar-derived operational shift logic;
- advanced Project schedule-context analysis.

## Explicit non-goals

Project Operational Mapping must never become a path to:

- CPM or critical-path calculation;
- float calculation;
- schedule optimisation or recovery planning;
- resource levelling;
- automatic date movement;
- Project formula evaluation;
- automatic predecessor/constraint/calendar/baseline modification;
- Project Critical/slack-driven Critical reporting membership;
- hidden Project write-back;
- native `.mpp` writing;
- automatic application permissions from category membership.
