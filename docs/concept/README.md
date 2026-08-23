# Concept and Architecture Pack v1.3 Summary

Shutdown Tracker is a live execution-control platform for shutdown, turnaround, outage, and major-overhaul work. Microsoft Project remains the schedule calculation and master-file authority.

## Product authority model

The platform separates three responsibilities:

- **Shutdown Tracker** captures and approves execution inputs.
- **Microsoft Project** recalculates a disposable candidate schedule.
- **Tier 1** controls candidate review and the recorded disposition; the relevant schedule owner or Microsoft Project operator performs any external adoption or merge/import action.

Shutdown Tracker does not calculate CPM, critical path, float, recovery schedules, resource levelling, or dependency consequences itself. It does not silently overwrite the accepted master and does not provide server-side native `.mpp` writing.

Microsoft Project may change planned dates, durations, summary roll-ups, work, slack, criticality, and related values when approved execution inputs are applied. Those are candidate-schedule consequences to review, not hidden Shutdown Tracker-authored schedule values.

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

## Candidate schedule handoff

The target handoff is:

```text
immutable accepted Project source
-> reviewed execution facts
-> Tier 1-approved input manifest
-> disposable Project candidate
-> Microsoft Project recalculation
-> source-versus-candidate delta
-> Tier 1 candidate decision
-> optional manual master adoption
```

A read-only schedule-impact comparison is allowed in the Master Console. Editable schedule planning remains in Microsoft Project.

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

- Start, Pause, Resume, Block, Complete;
- structured progress;
- Tier 2 tracking validation where required;
- Tier 1 input review;
- task-owned Delays / Problems and Actions;
- task-owned Evidence and History;
- Critical reports and reporting obligations;
- candidate schedule review and audit.

Execution actions are not automatic aliases for Project fields.

## Progress methods

Projects may configure the business-appropriate progress method:

- `% Complete` for duration progress;
- `Physical % Complete` for measured physical scope where site practice supports it;
- `% Work Complete` only when resource/assignment Work is intentionally maintained;
- state-only tracking where a percentage is not meaningful.

Field recognition, reviewability, handoff support, and project enablement remain separate decisions.

## MVP direction

The MVP focuses on:

- immutable Project snapshot import;
- Project source discovery and Operational Mapping;
- execution state and structured progress;
- Tier 2 validation where required and Tier 1 Project-input review;
- Task Dashboard-owned Discussion, Delays / Problems, Actions, Evidence, and History;
- Critical reporting;
- approved-input/candidate-schedule handoff;
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

A read-only candidate-impact Gantt/timeline is not considered a scheduling UI and is permitted when it helps Tier 1 review.
