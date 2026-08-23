# ADR-001: Microsoft Project Integration

Status: Accepted

## Context

Shutdown Tracker imports Microsoft Project schedule snapshots, captures live execution information, allows authorised Tier 1 input in the Master Console, and must return reviewed information to the Tier 1 schedule owner or Microsoft Project operator without becoming a second scheduling engine or silently changing the accepted master schedule.

The product purpose of the handoff is to create a **complete updated Project schedule candidate** that can be opened in Microsoft Project, recalculated by Project, reviewed by Tier 1, and then either rejected, retained, used as the next schedule/master, or merged/imported into another existing Project schedule under Tier 1 control.

Microsoft Project recalculates interdependent tracking and schedule fields when progress/actual inputs are applied. A patch-shaped XML document that contains only one or two task fields is therefore not equivalent to the complete updated schedule candidate required by the product.

## Decision

- Use MPXJ for Project-file parsing and MSPDI/XML processing where appropriate.
- Use MSPDI/XML as the primary open interchange format.
- Do not implement a server-side native `.mpp` writer.
- Treat the accepted Project source file/snapshot as immutable.
- Allow proposed inputs to originate from Tier 2/Tier 3 execution information and/or authorised Tier 1 Console entry under the active handoff policy.
- Require every Project-bound input to pass the applicable provenance, tracking-validation, eligibility, exact-review, approval-binding, and freshness controls; Tier 1 origin does not bypass those integrity controls.
- Treat approved facts as an **input manifest**, not as the complete calculated schedule state.
- Produce a **separate complete updated Project candidate schedule** from the accepted source plus the approved-input manifest.
- Open/import that candidate in Microsoft Project so Project performs its own recalculation.
- Present the resulting candidate and source-versus-candidate delta for Tier 1 review.
- Allow the Tier 1 schedule owner to reject the candidate, retain it for further review, use it as the next controlled schedule/master, or use Microsoft Project to merge/import it into another existing Project schedule.
- Never silently overwrite or save the accepted master schedule.
- Record source hash, approved-input identity/hash, candidate hash, Project version, semantic delta, Tier 1 decision, and later adoption/merge provenance.

A Tier 1-controlled Microsoft Project companion or other Project-native application mechanism is not prohibited by this ADR. It requires a separately reviewed implementation design that proves it operates on a disposable copy, applies only approved inputs, cannot silently overwrite the source/master path, and produces auditable candidate/delta evidence.

“Tier 1 schedule owner” and “Microsoft Project operator” describe external schedule-handling activity. They do not create additional Shutdown Tracker application roles.

## Consequences

- Manual Microsoft Project round-trip testing remains required for handoff milestones.
- Standalone candidate use and merge/import into an existing schedule are separate Microsoft Project behaviours and require separate acceptance evidence before either mode is claimed production-ready.
- The final candidate may contain Project-calculated changes to dates, durations, roll-ups, work, slack, criticality, and related fields. Those changes are not automatically errors; they must be classified as Project-calculated consequences and reviewed.
- Candidate review must distinguish approved Shutdown Tracker inputs, Project-calculated consequences, Tier 1 schedule-owner edits made in Project, and unexplained differences.
- The existing minimal/patch-shaped MSPDI writer may remain useful for input-manifest tests and diagnostics, but it is not the target complete candidate-schedule generator.
- Native `.mpp` generation by Shutdown Tracker remains out of scope; the Tier 1 schedule owner or Microsoft Project operator may nevertheless save a reviewed candidate as a Project file using Microsoft Project itself.
