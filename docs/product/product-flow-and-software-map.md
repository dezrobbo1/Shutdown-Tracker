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
3. **Critical** — Tier 1 configuration and oversight of selected operational reporting items.
4. **Import / Export** — schedule intake, immutable snapshot history, candidate preparation, and the Microsoft Project handoff.
5. **Project Settings** — membership, direct-report relationships, operational mappings, timezone, operational-day settings, and lifecycle controls.

Problems, discussion, delays, actions, evidence, history, and import/export context belong within the relevant Task Dashboard. They are not permanent top-level Console applications.

## Approved Mobile structure

The Mobile App has one top-level operational destination:

- **Assigned Tasks**

An assigned task or assigned summary-work-pack reporting obligation opens its Task Detail. The Task Detail exposes only the task-owned functions available to that Tier 2 or Tier 3 assignment.

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
