# Findings

## Confirmed

- A complete Microsoft Project XML file can contain mutually contradictory task, assignment, and timephased progress state.
- Setting only task `PercentComplete`, `ActualStart`, and `ActualFinish` was not sufficient to complete assigned BOILER tasks coherently.
- XML validity, source preservation, task identity, MPXJ readback, and successful file generation do not prove Microsoft Project semantic compatibility.
- Microsoft Project-authored completion can change task, assignment, work, timephased, summary, and wider schedule facts.
- User-authorised execution input must be distinguished from the dependent XML transaction and from later Project-calculated consequences.
- Project GUID can change during a valid open/save round trip while the complete task UID/ID/name/WBS/summary identity set remains stable.
- Broad timephased serialization can be normalized by Project: the supplied source contains task, resource, and assignment timephased rows, while the failed Project resave retains only assignment timephased rows.

## Project-authored completion pattern

For matching assigned task UIDs `43`, `318`, and `319`, the Project-authored reference repeatedly writes:

- 100% task and work completion;
- actual start and finish;
- full Actual Duration and Actual Work;
- zero Remaining Duration and Remaining Work;
- task and assignment Stop/Resume at completion;
- direct task Type 11 progress with value 100;
- assignment Type 2 actual work replacing the source Type 1 work representation.

This is strong enough to design an evidence-derived experimental completion profile. It does not establish the minimal required field set and does not authorize copying changed task GUIDs, assignment UIDs, resource UIDs, or wider schedule calculations.

## Current profile status

| Profile | Status | Use |
|---|---|---|
| Intent log only | Baseline | Measure native open/save normalization without progress edits |
| Task scalar diagnostic | Disproved for assigned-task completion | Reproduce and compare the failed three-field mechanism |
| Assigned-task completion native-evidence v0 | Design evidence available; not implemented | Next bounded PR after the reset merges |
| Native semantic profile | Not approved | Requires a one-task Microsoft Project open/save/reopen pass |

## Repository decision

PR #73 remains a reset and evidence laboratory. It now accepts both:

- a **strict candidate result**, where the complete candidate task identity set is preserved; and
- a **reference schedule**, where touched task identities match but the broader task population differs.

The completion writer is deliberately excluded from PR #73. The first post-reset PR should implement only the evidence-derived assigned-task completion v0 profile and trial it on one assigned task before expanding scope.
