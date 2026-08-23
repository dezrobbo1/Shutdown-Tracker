# ADR-009: UX/UI Architecture

Status: Accepted

## Context

Shutdown Tracker has exactly three application user tiers and two separate client applications over one shared platform. Tier 1 needs whole-project project-control surfaces. Tier 2 and Tier 3 need a focused field client containing only explicitly assigned work.

The task, not a generic problem/evidence/chat application, is the central operational record. The interface must also distinguish project attention conditions, task execution state, reporting state, and transport/sync state.

## Decision

Adopt the application structure defined in [Product Flow and Software Map](../product/product-flow-and-software-map.md).

The entry flow is:

```text
Login
-> Projects Home
-> Create or open project
-> Project Console
```

Projects Home exposes project creation to users with the workspace entitlement, project search, active/draft/closed/archived groupings, and project opening. A project switcher remains available after entry.

The Tier 1-only Master Console has these top-level sections:

1. **Today**
2. **Tasks**
3. **Critical**
4. **Import / Export**
5. **Project Settings**

The Task Dashboard is the operational centre. It contains Overview, Execution, People, Discussion, Delays / Problems, Actions, Evidence, History, and Project/import/export context where relevant. Problems, comments, actions, evidence, and history are contextual task sections rather than permanent top-level Console applications.

The Tier 2/Tier 3 Mobile App has one top-level operational destination:

- **Assigned Tasks**

An assignment opens the relevant Task Detail or assigned summary-work-pack reporting view. There is no separate Mobile Today, Problems, Evidence, Sync, or Critical page. Sync is a visible transport/recovery state within assigned work, not a navigation destination. Critical reporting obligations are presented through the assigned task or work-pack view.

The Console and Mobile App may share backend, identity, data, audit, design tokens, and implementation libraries. They are separate clients, not responsive variants that must reproduce one another's navigation or authority.

## Consequences

- Console access is Tier 1 only and supports whole-project operational control.
- Mobile access is Tier 2/Tier 3 only and is bounded by explicit task and reporting assignments.
- Today remains a high-signal 24-hour project view; inclusion in Today does not establish task execution state or authority.
- Critical is operational reporting configuration and oversight, not critical-path calculation.
- Project classifications, categories, saved views, Resource `Group`, WBS, and Critical membership can shape presentation and bulk-assignment selection but never grant access.
- Task execution state follows the explicit imported-state and audited-event derivation in [Task Operational Model](../product/task-operational-model.md). Passing a planned start does not make a task In Progress.
- Schedule editing and dependency planning are not part of the baseline UX.
- Import / Export keeps an import-review surface. The final export/round-trip workflow remains deferred under [ADR-012](ADR-012-product-trial-foundation-and-export-deferral.md).
