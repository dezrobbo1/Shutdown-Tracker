# User Tier and Assignment Model

This document is primary product authority for project membership, the three application user tiers, direct-report relationships, and task authority.

## Exactly three project user tiers

Shutdown Tracker has exactly three project user tiers: **Tier 1**, **Tier 2**, and **Tier 3**. Job titles, disciplines, contractors, work groups, and schedule classifications are not application roles.

### Tier 1

Tier 1:

- accesses the Master Console only;
- has unrestricted visibility across the project;
- may view and update any task;
- may perform execution actions on any task;
- may create, update, correct, supersede, or close related operational records under the record's audit rules;
- may create and configure Critical items;
- may assign tasks or tracking responsibility to Tier 2;
- may manage project users, direct-report relationships, settings, imports, exports, and lifecycle;
- remains unrestricted by categories, filters, saved views, discipline, contractor, WBS, or Critical membership.

Tier 1 authority is operational authority within the selected project. It does not allow Shutdown Tracker to calculate schedules, bypass immutable evidence, weaken exact candidate approval binding, or silently change a Microsoft Project master file.

### Tier 2

Tier 2:

- accesses the Mobile App only;
- sees tasks explicitly assigned by Tier 1 for tracking;
- may update those assigned tasks;
- may assign those tasks to Tier 3 users who directly report to them in that project;
- retains tracking responsibility after assigning field work to Tier 3;
- may submit Critical reports explicitly assigned by Tier 1 through the assigned task or summary-work-pack view;
- may not browse the whole project.

A Tier 2 assignment means **tracking responsibility**. Assigning a task onward does not transfer or end that responsibility.

### Tier 3

Tier 3:

- accesses the Mobile App only;
- sees tasks explicitly assigned by Tier 2;
- may update those assigned tasks;
- is assigned to each task as either `WORKING_ON` or `FIELD_CONTROL`;
- may not assign work to other users;
- does not configure or own formal Critical reporting.

`WORKING_ON` records that the Tier 3 user is performing the work. `FIELD_CONTROL` records that the Tier 3 user controls or coordinates the work at the field task level. Both are explicit task-assignment relationships, not application tiers or permissions derived from schedule data.

## Project membership

Membership is project-scoped. A person may have a different tier or no membership in another project.

Each project membership records at least:

- application identity;
- project identity;
- tier;
- activation and deactivation history;
- actor and time for material changes.

Deactivation removes current access but must not delete or rewrite the person's earlier assignments, execution events, approvals, reports, comments, or audit identity. Reactivation creates a new current membership state while preserving history.

Changing a user's tier is an auditable membership change. It does not rewrite the authority under which past actions occurred.

## Tier 2 to Tier 3 direct-report relationship

A Tier 2 user may assign work only to an active Tier 3 user recorded as directly reporting to that Tier 2 user in the same project.

The relationship must be explicit, project-scoped, effective-dated or otherwise historically reconstructable, and auditable. Ending the relationship prevents new assignments through it but does not erase assignment history.

## Assignment records and history

Task authority comes from explicit assignments:

- Tier 1 assigns tracking responsibility to Tier 2;
- the assigned Tier 2 may assign field participation or control to a direct-report Tier 3;
- Tier 2 retains tracking responsibility;
- Tier 3 receives either `WORKING_ON` or `FIELD_CONTROL` for that task.

Every assignment, reassignment, end, correction, and reversal preserves:

- project and task identity;
- assigning and assigned users;
- assignment type;
- effective state/time;
- reason where required;
- actor and audit provenance.

Assignment history is not destructively edited. Current assignment projections are derived from that history.

## Authentication and project creation

OIDC is the authentication direction. Authentication proves identity; active project membership, tier, direct-report relationship, and explicit assignment determine application authority.

A workspace-level `can-create-project` entitlement may control who can create a project before project membership exists. That entitlement is not a project role and is not a fourth user tier. A newly created project must still gain an active Tier 1 project member before activation.

## Values that never grant authority

Do not infer application authority from:

- discipline;
- contractor;
- work group;
- area;
- WBS or summary ancestry;
- Microsoft Project custom fields;
- Resource `Group`;
- Critical membership;
- operational categories or saved views.

These values may support filtering, grouping, display context, saved views, Critical selection, and bulk Tier 2 assignment. Saved assignments and active membership determine Tier 2 and Tier 3 access.
