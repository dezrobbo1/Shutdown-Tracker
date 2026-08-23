# Concept and Architecture Pack v1.3 Summary

Shutdown Tracker is a live execution-control platform for shutdown, turnaround, outage, and major-overhaul work. Microsoft Project remains the schedule calculation and master-file authority.

## Product authority model

- **Shutdown Tracker** captures operational execution truth, assignments, Critical reporting, task-owned records, immutable imported snapshots, and audit.
- **Microsoft Project** remains schedule calculation and master-file authority.
- **Tier 1** has whole-project operational authority in the Console; Tier 2 and Tier 3 remain explicitly assignment-bounded in Mobile.

Shutdown Tracker does not calculate CPM, critical path, float, recovery schedules, resource levelling, or dependency consequences itself. It does not silently overwrite the accepted master and does not provide server-side native `.mpp` writing.

The final Project-bound input, export, recalculation, adoption, and re-import contract is deferred until operational frontend trials establish the facts that need to cross that boundary.

## Application clients

### Master Console

Tier 1-only project-control application with unrestricted project visibility and operational update authority.

Approved top-level sections:

- Today
- Tasks
- Critical
- Import / Export
- Project Settings

### Mobile App

Tier 2/Tier 3 satellite application limited to explicitly assigned tasks.

Approved top-level model:

- Assigned Tasks only

Problems, discussion, actions, evidence, and history live inside the relevant Task Dashboard/Task Detail. Sync is a visible transport/recovery state, not navigation. Offline-capable field workflows are core direction. Delivery technology must not create a separate authority or data model.

## Project import and deferred export

The active foundation imports and inspects immutable Project source/snapshot facts. Console Import review may parse MSPDI/XML in the browser and may show configured read-only snapshot API data.

Export remains visibly not finalised. Existing preview/writer code is experimental technical infrastructure, not the required product flow. Editable schedule planning remains in Microsoft Project.

## Project Operational Mapping

Microsoft Project supplies source facts, structure, and classifications. Shutdown Tracker adds Tier 1-configured operational interpretation without rewriting those source facts.

Initial source modes:

1. direct imported task fields/custom fields;
2. task hierarchy/WBS/selected summary ancestry;
3. task assignments resolved through Resource `Group`.

Operational Categories may support filtering, grouping, query-only Scope, Saved Views, Today, Critical selection/reporting, Task Dashboard context, and bulk Tier 2 assignment.

Resource-derived categories must support multiple values where a task has assignments from more than one Resource Group.

Formula-backed Project fields may be used as read-only classification context. Shutdown Tracker does not reproduce the Project formula engine.

Classification never grants application authority by itself.

## Critical Work Package reporting

A Critical item is an operational reporting object, not a scheduling object.

The first approved Critical Work Pack UX selects one Project summary task plus descendants. Existing V006 multi-summary compatibility is retained but not exposed unless separately approved.

Project Critical/slack fields may be displayed as read-only Project context but do not automatically define Critical reporting membership.

## Execution model

The platform should support:

- system-timestamped Can't Start, Start, Pause, Resume, and Finish actions;
- structured progress;
- Tier 2 tracking responsibility and Tier 3 field assignment;
- task-owned Delays / Problems and Actions;
- task-owned Evidence and History;
- Critical reports and reporting obligations;
- append-only execution, correction, and reporting audit.

Execution actions are not automatic aliases for Project fields.

Can't Start leaves execution Not Started. Pause intervals may link to adverse delays/problems without making every pause adverse. Unfinished end-of-shift work uses a plain-language Tracker field progress observation. Ordinary Mobile users are not asked to enter execution times or shown Project-specific progress-field terminology.

## Progress methods

Projects may configure the business-appropriate progress method:

- `% Complete` for duration progress;
- `Physical % Complete` for measured physical scope where site practice supports it;
- `% Work Complete` only when resource/assignment Work is intentionally maintained;
- state-only tracking where a percentage is not meaningful.

Tracker progress recognition and Project-field interpretation remain separate decisions. The active trial does not lock a one-to-one Project-field mapping.

Critical reporting uses a versioned per-item policy with supported timing/triggers and a controlled content catalogue. Routine reporting is not mandatory for every task, known execution facts should be reused, and the product does not provide a generic report/form builder.

## MVP direction

The MVP focuses on:

- immutable Project snapshot import;
- Project source discovery and Operational Mapping;
- execution state and structured progress;
- Tier 2 tracking responsibility and Tier 1 whole-project operational review;
- Task Dashboard-owned Discussion, Delays / Problems, Actions, Evidence, and History;
- Critical reporting;
- import review and an explicitly deferred Project export surface;
- three-tier membership, direct reports, explicit assignments, and offline foundations;
- browser/installable delivery for both application experiences.

Explicitly excluded:

- Shutdown Tracker CPM/float/critical-path calculation;
- editable Gantt/dependency scheduling UI;
- recovery/scheduler engine;
- resource levelling;
- AI schedule optimisation;
- hidden master write-back;
- server-side native `.mpp` writing;
- automatic permissions from Project categories;
- generic chat clone behaviour.

Any future schedule-impact comparison requires a separately approved product and architecture decision.
