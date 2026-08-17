# ADR-008: MVP Scope Boundary

Status: Accepted

## Context

The product must remain focused on execution control without accidentally forbidding the planner-review workflow that gives Project handoff its value.

The handoff goal is not merely to emit a sparse patch. Shutdown Tracker should be able to produce a complete updated Project candidate from approved field/planner inputs, let Microsoft Project recalculate it, and let the planner decide whether to reject it, retain it, use it as the next schedule, or merge/import it into another schedule.

## Decision

The MVP excludes:

- a Shutdown Tracker CPM/critical-path/float engine;
- resource levelling and recovery scheduling by Shutdown Tracker;
- editable dependency-map or Gantt scheduling UI;
- automatic schedule optimisation;
- hidden or unattended master-file write-back;
- silent merge/import into an existing master schedule;
- server-side native `.mpp` writing;
- automatic Project formula evaluation;
- AI schedule prediction/optimisation;
- a generic chat clone;
- custom dashboard builders.

The MVP may include:

- reviewed field execution inputs;
- authorised planner-entered inputs from the Master Console;
- sealed approved-input manifests;
- complete updated MSPDI/XML candidate schedules generated from an accepted source;
- Microsoft Project recalculation of a disposable candidate;
- read-only source-versus-candidate schedule impact views;
- Project-calculated consequence reporting;
- explicit planner reject/retain/adopt/merge decision workflows;
- use of a reviewed candidate as the next controlled schedule;
- planner-controlled import/merge of a candidate into a disposable or backed-up existing Project schedule;
- diagnostic or manual Project-native handoff steps while the production mechanism is being proven.

A planner-controlled Microsoft Project companion is a permissible future implementation option. It requires a focused ADR/implementation review before production use; it is not a blanket product prohibition.

## Consequences

- “No scheduler” means Shutdown Tracker does not calculate the schedule itself.
- It does not mean Microsoft Project is prevented from recalculating a complete updated candidate.
- A planner-controlled candidate merge/import is allowed as a product outcome; unattended merge/write-back is not.
- Read-only candidate-impact visualization is allowed; schedule editing and logic authoring remain in Microsoft Project unless a later explicit product decision expands the boundary.
- Scope-expanding direct write authority still requires explicit product and ADR review.
