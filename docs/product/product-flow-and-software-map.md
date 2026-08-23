# Product Flow and Software Map

This document is primary product authority for the Shutdown Tracker platform, its client applications, and its navigation.

## Platform shape

Shutdown Tracker is one platform with two separate client applications over one backend, project state, identity boundary, and audit model.

| Client | Users | Purpose | Access boundary |
| --- | --- | --- | --- |
| Master Console | Tier 1 only | Project control and whole-project operations | Every task and operational record in the project |
| Mobile App | Tier 2 and Tier 3 only | Assigned field work and reporting | Explicitly assigned tasks and reporting obligations only |

The Console and Mobile App are not two layouts of one responsive application. They may share components and delivery technology, but they have different users, information architecture, and operating responsibilities.

### Master Console

The Master Console is the Tier 1 project-control application. Tier 1 has unrestricted operational visibility and update authority within the project, including execution actions on any task, subject to the Microsoft Project handoff and audit rules.

### Mobile App

The Mobile App is a satellite field application. It receives explicitly assigned tasks and reporting obligations, captures execution facts, and sends those facts back to the shared platform. It is not a mobile version of the Console and does not expose whole-project browsing.

## Entry flow

```text
Login
-> Projects Home
-> Create or open project
-> Project Console
```

Projects Home supports:

- creating a project when the user has the workspace entitlement;
- active projects;
- draft projects;
- closed projects;
- archived projects;
- project search;
- opening a project;
- a project switcher after entering a project.

Project lifecycle meaning and project-creation rules are defined in [Project Lifecycle and Import / Export](project-lifecycle-and-import-export.md).

## Approved Console structure

The Console top-level sections are:

1. **Today** — high-signal view of the configured 24-hour operational day, attention conditions, due reporting, and exceptions.
2. **Tasks** — project task explorer, filters, saved views, and entry to each Task Dashboard.
3. **Critical** — Tier 1 configuration and oversight of selected operational reporting items, their versioned per-item policies/templates, timing/triggers, supported required content, and report history.
4. **Import / Export** — schedule intake, immutable snapshot history, candidate preparation, and the Microsoft Project handoff.
5. **Project Settings** — membership, direct-report relationships, operational mappings, timezone, operational-day settings, and lifecycle controls.

Problems, discussion, delays, actions, evidence, history, and import/export context belong within the relevant Task Dashboard. They are not permanent top-level Console applications.

### Today

Today is Console-only. It is a configurable 24-hour operational projection over the shared project task and operational records, normally anchored to the project's timezone and operational-day start. It is not another data model and does not change task authority or execution state.

Today should show:

- planned work that overlaps the period;
- actual execution position, including Not Started, In Progress, Paused, and Completed work, plus blocked/delayed operational conditions;
- late starts and work running beyond planned finish;
- tasks with no recent update;
- Critical reports due or overdue;
- actions due or overdue;
- current Delays / Problems; and
- recent project activity.

### Tasks

Tasks is the full Project-like explorer for the accepted project task set. It supports:

- WBS hierarchy with expand/collapse;
- configurable columns, including mapping-derived context;
- search, filter, group, and sort;
- Saved Views; and
- entry to the Task Dashboard for leaf and summary tasks.

Summary tasks remain aggregate work-pack views. The ordinary Can't Start, Start, Pause, Resume, and Finish actions apply to executable leaf tasks. Can't Start leaves execution Not Started; a blocked/delayed condition is linked operational context rather than another way to establish In Progress.

### Project Settings

Project Settings contains:

- **General** — project name, timezone, operational-day settings, and other bounded project configuration;
- **Users** — Tier 1/Tier 2/Tier 3 membership and Tier 2-to-Tier 3 direct-report relationships;
- **Operational Mapping** — source interpretation for columns, filters, grouping, Saved Views, Today, Critical selection/reporting, and bulk Tier 2 selection context;
- **Project History** — project-level lifecycle, membership, configuration, import/export, and audit context; and
- **Lifecycle** — activation, closure/reopen, archive/restore, and eligible empty-draft/test deletion controls.

Operational Mapping never grants authority. A bulk selection creates explicit assignment records before Mobile access changes.

## Approved Mobile structure

The Mobile App has one top-level operational destination:

- **Assigned Tasks**

An assigned task or assigned summary-work-pack reporting obligation opens its Task Detail. The Task Detail exposes only the task-owned functions available to that Tier 2 or Tier 3 assignment.

Mobile execution actions capture their event times automatically; ordinary Tier 2/Tier 3 users do not enter execution dates/times manually. Formal Tier 2 Critical obligations remain contextual to the relevant task/work-pack and reuse known execution facts under the item's versioned reporting policy.

There is no separate Mobile Today, Problems, Evidence, Sync, or Critical page. Problems and evidence are created or reviewed in the relevant Task Detail. Critical reporting is delivered through the assigned task or summary-work-pack view.

Sync remains a persistent, visible transport and recovery state. Queued, sending, server-received, failed, and conflict states must be visible where relevant, but sync is not a separate operational destination.

## Task-centred operating rule

The Task Dashboard is the operational centre of Shutdown Tracker. Today, Tasks, Critical, and Import / Export may surface or filter work, but operational records remain attached to the relevant task or aggregate summary-task view.

The detailed task contract is [Task Operational Model](task-operational-model.md). User authority is defined in [User Tier and Assignment Model](user-tier-and-assignment-model.md).

## Shared-platform invariants

Both applications use the same:

- OIDC-authenticated identity;
- project membership records;
- task and immutable Project snapshot identities;
- assignment history;
- execution-event history;
- structured operational records;
- offline submission semantics;
- audit and correction model;
- Microsoft Project authority boundary.

Shared platform services do not make the two clients one responsive application.
