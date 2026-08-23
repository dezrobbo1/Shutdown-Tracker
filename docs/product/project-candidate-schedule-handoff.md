# Project Candidate Schedule Handoff

> **Superseded technical research.** [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md) defers the final Project export/round-trip contract. This document does not define current product authority, a delivery prerequisite, or a mandatory acceptance gate.

## Purpose

This document defines the product contract between reviewed Shutdown Tracker execution inputs and Microsoft Project schedule recalculation.

The product objective is to turn approved information gathered from assigned field work and/or entered by Tier 1 in the Master Console into a **complete updated Microsoft Project candidate schedule**. The relevant schedule owner or Microsoft Project operator opens the candidate in Microsoft Project, Project performs its own recalculation, and Tier 1 reviews the result before recording what should happen to it.

The candidate may then be:

- rejected;
- retained for further review;
- used as the next schedule/master under Tier 1 control; or
- imported/merged by the relevant schedule owner or Microsoft Project operator into another existing Microsoft Project schedule after the Tier 1 disposition.

The goal is not to prevent the schedule from changing. The goal is to make every input and resulting change attributable, reviewable, reversible, and Tier 1-controlled.

## Core rule

> Shutdown Tracker controls and audits the approved inputs. Microsoft Project calculates the updated candidate schedule. Tier 1 controls the recorded candidate disposition, and the relevant schedule owner or Microsoft Project operator performs any external Project action.

## Inputs may come from assigned field execution or Tier 1 Console entry

Approved inputs may originate from:

- field execution events and progress submissions;
- Tier 2-corrected field facts where tracking validation is required;
- Tier 1-entered execution/progress facts in the Master Console; or
- another explicitly authorised structured source under the active handoff policy.

Tier 1-entered values do not bypass provenance. They must still record actor, timestamp, source snapshot, task identity, old value, proposed value, policy, and approval state.

This contract does not automatically authorise the Console to edit Project scheduling logic such as predecessors, calendars, constraints, baselines, resource levelling, or arbitrary planned dates. Direct input authority remains policy-controlled.

## Objects that must not be confused

### Accepted source schedule

The immutable Project file/snapshot used as the planning baseline for the current execution cycle. It has a source file hash and snapshot identity.

### Approved input

One exact reviewed fact such as a progress percentage, actual start, actual finish, physical progress, or another value explicitly enabled by the active handoff policy.

Approval of one input does not mean approval of every value Microsoft Project may later calculate from it.

### Approved-input manifest

An immutable list of the exact inputs approved for one candidate calculation. It includes source snapshot/file identity, task identities, field/value pairs, candidate IDs, approval IDs, actor/timestamp provenance, policy identity, and a manifest hash.

### Updated candidate schedule

A new complete Project schedule produced from the accepted source plus the approved-input manifest. MSPDI/XML is the primary open interchange format. The candidate must preserve the source schedule context required by Microsoft Project and must have a separate file/artifact identity and hash.

The candidate is not a sparse field patch presented as though it were a complete schedule.

### Project-calculated candidate

The updated candidate after Microsoft Project has opened/imported it and recalculated its dependent schedule state. Project may alter dates, durations, roll-ups, work, assignments, timephased values, slack, criticality, and other dependent values.

### Candidate delta

The semantic comparison between the accepted source and the Project-calculated candidate.

Every material difference should be classified as one of:

- **Approved Shutdown Tracker input** — the exact fact approved before calculation.
- **Microsoft Project-calculated consequence** — a dependent value Project recalculated.
- **Manual Project-operator edit** — an explicit change made by the schedule owner or Microsoft Project operator during candidate review, if any.
- **Unexpected/unexplained difference** — a change that requires investigation before acceptance.

Unchanged source facts remain traceable through the source identity/hash.

## Authority model

| Authority | Owner | Responsibility |
| --- | --- | --- |
| Execution/input authority | Shutdown Tracker review workflow | Capture, enter, review, approve and audit exact inputs |
| Calculation authority | Microsoft Project | Recalculate the complete updated candidate schedule |
| Candidate/adoption authority | Tier 1-controlled decision | Reject, retain, or record adopt/merge disposition; external Project activity is performed by the relevant schedule owner or Microsoft Project operator |

## Target workflow

```text
accepted source schedule + hash
        ↓
field execution information
+ Tier 1-entered authorised information
        ↓
Tier 2 tracking validation where required, then Tier 1 input review
        ↓
approved-input manifest + hash
        ↓
complete updated MSPDI/XML candidate generated from source
        ↓
open/import candidate in Microsoft Project
        ↓
Microsoft Project recalculates candidate
        ↓
source-versus-candidate semantic delta
        ↓
Tier 1 candidate review
        ↓
choose one:
  reject
  retain for further review
  use candidate as next schedule/master
  merge/import candidate into another existing schedule
```

The accepted source/master must never be overwritten as part of candidate generation or review.

## Input fields versus calculated consequences

The direct-input policy and the candidate delta are separate concerns.

A field that Shutdown Tracker is not allowed to propose directly may still change after Microsoft Project recalculates the candidate.

| Value | Direct Tracker input by default? | May change in Project-calculated candidate? |
| --- | --- | --- |
| Percent Complete | Policy-controlled | Yes |
| Physical % Complete | Policy-controlled / project-specific | Yes |
| Actual Start | Policy-controlled | Yes |
| Actual Finish | Policy-controlled | Yes |
| Planned Start/Finish | No by default | Yes |
| Duration | No by default | Yes |
| Summary roll-ups | No | Yes |
| Assignment progress/work | No by default | Yes |
| Slack/Criticality | No | Yes |
| Dependencies/constraints/calendars | No by default | Normally preserved unless deliberately changed in Project |

The presence of a Project-calculated consequence in the candidate does not expand Shutdown Tracker's direct input authority.

## Field support model

Do not represent field support as a single boolean. Track these dimensions separately:

- recognised by the importer/candidate vocabulary;
- reviewable as an execution or Tier 1-entered fact;
- authorised as a direct input by product policy;
- supported by the selected handoff mechanism;
- enabled for the current project/import profile.

A failed diagnostic for one handoff mechanism means **unsupported by that handoff mechanism**, not permanently unsupported by the product.

### Progress semantics

- `% Complete` is duration-progress and can trigger Project duration/actual calculations.
- `Physical % Complete` is physical-scope progress and should be enabled only where the site uses it consistently.
- `% Work Complete` is work/assignment progress and should be deferred unless Project resource assignments and Work are intentionally maintained.
- Can't Start/Start/Pause/Resume/Finish are the ordinary system-timestamped Mobile execution actions; they are not automatically equivalent to Project percentage or date fields. Can't Start remains Not Started, and linked blocked/delayed context does not create an Actual Start.

## Handoff mechanisms

The product may support more than one mechanism behind the same approved-input contract.

### Full-source MSPDI updated candidate

This is the primary open-format target.

1. Start from the exact accepted Project source/snapshot.
2. Preserve the complete Project context required for a usable schedule.
3. Apply only the approved direct inputs.
4. Write a new MSPDI/XML candidate under a new identity/path.
5. Open/import it in Microsoft Project.
6. Let Microsoft Project recalculate.
7. Review the resulting candidate and delta.

This mechanism is valid only when manual Project testing proves the exact approved inputs survive and the resulting complete schedule is reviewable.

### Tier 1-controlled Microsoft Project companion

A future Windows companion may:

1. verify the exact accepted source file hash;
2. open a disposable copy in Microsoft Project;
3. apply only the approved-input manifest through Project's supported automation/object model;
4. allow Project to recalculate;
5. save a new candidate under a new path;
6. produce candidate/delta evidence;
7. leave the accepted source/master untouched.

This mechanism requires a dedicated implementation review before production use.

### Manual Project-operator input package

A fallback mode may present the approved inputs as a signed/reviewable package for the relevant schedule owner or Microsoft Project operator to enter manually in Project. It is slower but preserves the same Tier 1 input-review and disposition authority model.

## Candidate review

The Tier 1 review surface should show:

- source schedule identity/hash;
- updated candidate identity/hash;
- Microsoft Project version/build used for calculation;
- approved-input manifest and approvals;
- exact approved input values;
- project finish movement;
- planned-date/duration changes;
- summary roll-up changes;
- assignment/work changes;
- critical/slack changes reported by Project;
- manual schedule-owner or Microsoft Project operator edits made during review, if any;
- unexplained differences;
- final candidate decision.

A read-only Gantt or timeline comparison is permitted here if it helps Tier 1 understand impact. It must not become a Shutdown Tracker scheduling engine or dependency editor.

## Tier 1 outcomes

Tier 1 may record one of these outcomes after review. Any external Project action is then performed by the relevant schedule owner or Microsoft Project operator.

### Reject candidate

The candidate is retained as immutable evidence but is not adopted or merged.

### Retain for further review

The candidate remains separate from the master and can be reviewed again or superseded by a later candidate.

### Use as the next schedule/master

Tier 1 may record the reviewed candidate for adoption as the next controlled schedule. The relevant schedule owner or Microsoft Project operator performs the external adoption action. Adoption is a separate event and must record the adopted file/hash and lineage.

### Merge/import into an existing Project schedule

After Tier 1 records the merge/import disposition, the relevant schedule owner or Microsoft Project operator may use Microsoft Project's own import/merge workflow to apply the candidate to another schedule. This is a **Tier 1-controlled Microsoft Project operation**, not an unattended Shutdown Tracker write-back.

Because merge/import can affect matching tasks and schedule state, the first supported workflow must operate on a disposable/backed-up destination copy and record:

- destination schedule identity/hash before merge;
- candidate identity/hash;
- Microsoft Project version/build;
- merge/import mode used;
- result schedule identity/hash;
- observed merge warnings/conflicts;
- Tier 1 decision after reviewing the merged result.

The original destination/master must not be silently overwritten by Shutdown Tracker.

## Adoption and merge provenance

`Candidate accepted` is not the same as `master adopted` or `merged into existing`.

Record the final disposition separately with at least:

- source schedule hash;
- approved-input manifest hash;
- candidate hash;
- Tier 1 decision;
- disposition: rejected / retained / adopted_as_new_master / merged_into_existing;
- destination schedule identity/hash where applicable;
- result hash where applicable;
- adopted/merged by and at;
- any manual Project edits performed during review.

## Verification gates

A candidate handoff passes only when:

1. the accepted source remains unchanged;
2. the exact approved inputs are traceable into the Project calculation;
3. the candidate is a separate complete schedule artifact;
4. Microsoft Project can open/import and recalculate it;
5. Project-calculated consequences are identifiable;
6. unexplained changes are surfaced;
7. Tier 1 can reject the candidate without affecting the source;
8. candidate and source hashes are recorded;
9. the Tier 1 decision is audited.

A merge/import workflow has an additional gate: it must be tested separately against a disposable existing schedule and must record the destination-before and result-after identities/hashes.

Do not fail a candidate merely because Microsoft Project legitimately recalculated dependent schedule fields. Fail when an approved input is lost/altered, the wrong task is affected, the source is overwritten, provenance is missing, or an unexplained change cannot be reviewed safely.

## Historical implementation evidence

The superseded PR #48 workstream reported guarded complete-source MSPDI/XML candidate generation from the accepted source plus approved inputs. That implementation and its real-human Microsoft Project gate are not present in, or required by, the active product foundation. Any minimal/patch-shaped writer retained from `main` remains experimental diagnostic compatibility only and must not be presented as the final product output.

The earlier security controls remain useful research inputs. They do not become current requirements unless a replacement export contract independently selects and validates them.
