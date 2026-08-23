# ADR-008: MVP Scope Boundary

Status: Superseded by [ADR-012](ADR-012-product-trial-foundation-and-export-deferral.md)

This record is retained as technical history. Candidate and round-trip capabilities listed here are not current MVP commitments. ADR-012 defines the active product-trial boundary.

## Context

The product must remain focused on execution control without accidentally forbidding the Tier 1 review workflow that gives Project handoff its value.

The handoff goal is not merely to emit a sparse patch. Shutdown Tracker should be able to produce a complete updated Project candidate from approved Tier 2/Tier 3 execution facts and Tier 1 inputs, let Microsoft Project recalculate it, and let Tier 1 record whether to reject it, retain it, adopt it as the next schedule, or have the relevant schedule owner or Microsoft Project operator merge/import it into another schedule.

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
- custom dashboard builders;
- whole-project browsing in the Tier 2/Tier 3 Mobile App;
- category-derived, area-derived, WBS-derived, contractor-derived, or Critical-derived application authority.

The MVP may include:

- reviewed Tier 2/Tier 3 execution inputs from explicitly assigned tasks;
- authorised Tier 1-entered inputs from any project task in the Master Console;
- sealed approved-input manifests;
- complete updated MSPDI/XML candidate schedules generated from an accepted source;
- Microsoft Project recalculation of a disposable candidate;
- read-only source-versus-candidate schedule impact views;
- Project-calculated consequence reporting;
- explicit Tier 1 reject/retain/adopt/merge decision workflows;
- use of a reviewed candidate as the next controlled schedule;
- Tier 1-controlled import/merge of a candidate into a disposable or backed-up existing Project schedule;
- diagnostic or manual Project-native handoff steps while the production mechanism is being proven.

A Tier 1-controlled Microsoft Project companion is a permissible future implementation option. It requires a focused ADR/implementation review before production use; it is not a blanket product prohibition.

## Consequences

- “No scheduler” means Shutdown Tracker does not calculate the schedule itself.
- It does not mean Microsoft Project is prevented from recalculating a complete updated candidate.
- A Tier 1-controlled candidate merge/import is allowed as a product outcome; unattended merge/write-back is not.
- Read-only candidate-impact visualization is allowed; schedule editing and logic authoring remain in Microsoft Project unless a later explicit product decision expands the boundary.
- Expansion of direct Project-write authority still requires explicit product and ADR review.
- Tier 1 whole-project Console authority and Tier 2/Tier 3 assignment-bounded Mobile authority do not alter the Microsoft Project handoff controls.
