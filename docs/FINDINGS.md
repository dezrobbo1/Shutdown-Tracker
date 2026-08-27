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

This is strong enough to implement an evidence-derived experimental completion profile. It does not establish the minimal required field set and does not authorize copying changed task GUIDs, assignment UIDs, Resource UIDs, or wider schedule calculations.

## Current profile status

| Profile | Status | Use |
|---|---|---|
| Intent log only | Baseline | Measure native open/save normalization without progress edits |
| Task scalar diagnostic | Disproved for assigned-task completion | Reproduce and compare the failed three-field mechanism |
| Assigned-task completion native-evidence v0 | Implemented and automated tests pass; native Project trial pending | Generate the one-task UID 43 candidate on draft PR #75 |
| Native semantic profile | Not approved | Requires the UID 43 Microsoft Project open/save/reopen pass |

## Current implementation boundary

The v0 writer is deliberately limited to one active, unstarted assigned leaf task whose actual start and finish equal its planned Start and Finish. It requires one non-zero Resource UID assignment and one matching Unit 1, Type 1 timephased row. It changes only the selected Task and Assignment blocks and verifies that the remainder of the source XML is byte-for-byte unchanged.

The writer preserves source task GUID, assignment UID, Resource UID, interval, unit, value, dependencies, calendars, resources, baselines, summaries, and unrelated XML content. It does not implement partial progress, Mark on Track, pauses, multiple assignments, off-plan actuals, or schedule calculation.

## Repository decision

The deployed `main` application must not expose v0 before the native trial. A premature merge was neutralized by PR #76, which removed the unverified profile from the active export registry. Draft PR #75 remains the controlled preview and evidence branch.

Do not merge PR #75 or expand the profile until task UID `43` passes the complete Microsoft Project open, recalculate, save, close, reopen, and result-import trial.
