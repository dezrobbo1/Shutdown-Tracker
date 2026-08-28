# Findings

## Confirmed

- A complete Microsoft Project XML file can contain mutually contradictory task, assignment, and timephased progress state.
- Setting only task `PercentComplete`, `ActualStart`, and `ActualFinish` was not sufficient to complete assigned BOILER tasks coherently.
- XML validity, source preservation, task identity, MPXJ readback, and successful file generation do not prove Microsoft Project semantic compatibility.
- Microsoft Project-authored completion can change task, assignment, work, timephased, summary, resource, and wider schedule facts.
- User-authorised execution input must be distinguished from the dependent XML transaction and from later Project-calculated consequences.
- Project GUID can change during a valid open/save round trip while the complete task UID/ID/name/WBS/summary identity set remains stable.
- Broad timephased serialization can be normalized by Project: the supplied source contains task, resource, and assignment timephased rows, while the failed Project resave retains only assignment timephased rows.

## Project-authored completion pattern

For matching assigned task UIDs `43`, `318`, and `319`, the Project-authored reference repeatedly contains:

- 100% task and work completion;
- actual start and finish;
- full Actual Duration and Actual Work;
- zero Remaining Duration and Remaining Work;
- task and assignment Stop/Resume at completion;
- direct task Type 11 progress with value 100;
- assignment Type 2 actual work replacing the source Type 1 work representation.

The companion `Shutdown-Tracker-Claude` repository has now supplied stronger evidence about which of those facts need to be authored. Its merged exporter generated the BOILER UID `43` candidate without directly authoring task Type 11 timephasing, and that candidate was opened, recalculated and saved successfully in Microsoft Project desktop build `16.0.20228.20188`. The task/assignment scalar closure and assignment Type 1 → Type 2 conversion survived. Therefore direct task Type 11 is now treated as Project-authored/result evidence rather than a required Tracker-authored input for this proven shape.

## Current profile status

| Profile | Status | Use |
|---|---|---|
| Intent log only | Baseline | Measure native open/save normalization without progress edits |
| Task scalar diagnostic | Disproved for assigned-task completion | Reproduce and compare the failed three-field mechanism |
| Assigned-task completion native-evidence v0 | Transaction shape Project-proven in `Shutdown-Tracker-Claude`; browser implementation confirmation pending | Generate the one-task UID 43 candidate on draft PR #75 |
| Partial assigned-task progress | Not proven | Must remain blocked pending native evidence |

## Proven v0 authoring shape

For the currently evidenced single-assignment, single-timephased-block completion case, Tracker authors:

### Task

- `PercentComplete = 100`
- `PercentWorkComplete = 100`
- Actual Start / Actual Finish
- Actual Duration = planned Duration
- Actual Work = planned Work
- Remaining Duration / Remaining Work = zero
- Stop / Resume = Actual Finish

### Existing assignment

- `PercentWorkComplete = 100`
- Actual Start / Actual Finish
- Actual Work = assignment Work
- Remaining Work = zero
- Stop / Resume = Actual Finish
- existing Type 1 timephased work converted to Type 2 over the same source interval, unit and value

The browser candidate does **not** add direct task Type 11 timephasing. If Microsoft Project adds or normalizes that row during recalculation/save, it is result evidence rather than a Tracker-authored mutation.

## Known Project-calculated/save consequences from the proven Claude round trip

The proven UID `43` result also showed differences that must not be confused with hidden Tracker input:

- summary ancestor roll-up, including percent/work progress, actual/remaining duration/work, actual-start boundary and Stop/Resume;
- resource roll-up of Percent Work Complete, Actual Work and Remaining Work;
- slack, late-date and Critical changes caused by recalculation;
- save metadata such as project Name, GUID, LastSaved and CurrentDate changing;
- numeric representation differences such as `0.00` versus `-0.00`, which are numerically equal.

These are comparison/classification rules, not exporter fields.

## Current implementation boundary

The v0 writer is deliberately limited to one active, unstarted assigned leaf task whose actual start and finish equal its planned Start and Finish. It requires one non-zero Resource UID assignment and one matching Unit 1, Type 1 timephased row. It changes only the selected Task and Assignment blocks and verifies that the remainder of the source XML is byte-for-byte unchanged.

The writer preserves source task GUID, assignment UID, Resource UID, interval, unit, value, dependencies, calendars, resources, baselines, summaries, and unrelated XML content. It does not implement partial progress, Mark on Track, pauses, multiple assignments, off-plan actuals, or schedule calculation.

## Repository decision

The deployed `main` application must not expose v0 until the lightweight browser implementation itself has been confirmed against Microsoft Project. Claude's proof establishes the transaction shape, not that this separate JavaScript implementation is byte/semantic-equivalent in all respects.

A premature merge was neutralized by PR #76, which removed the unverified profile from the active export registry. Draft PR #75 remains the controlled preview and evidence branch.

The next native check is therefore a confirmation test, not a discovery experiment: generate UID `43` from the PR #75 browser preview, open/recalculate/save/reopen it in Project build `16.0.20228.20188`, then compare it with both the source and Claude's proven result expectations.
