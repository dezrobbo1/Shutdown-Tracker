# Sunday → Monday Reporting-Cycle Trial

## Status

The Sunday bulk-completion experiment is **Microsoft Project-verified for the tested 13-task composition**.

The underlying `assigned-completion-native-v0` transaction was already proven for one BOILER task. This experiment has now shown that the same bounded transaction can be composed across 13 eligible tasks in one real BOILER candidate, survive Microsoft Project recalculation, survive MPP save/close/reopen, and retain the intended completions.

A no-Tracker control also reproduced the unrelated schedule changes seen during XML → MPP persistence, so those changes are classified as baseline Microsoft Project normalization rather than consequences of the Tracker transaction.

The Monday 50% portion remains intentionally **intent-only**. No partial-progress XML is generated until a native 50% assigned-task reference has been collected and verified.

## Trial page

Use the dedicated browser-local page:

```text
/src/bulk-trial.html
```

The main single-task lab remains available separately.

## Sunday planned-completion behaviour

1. Import the untouched Project XML source.
2. Enter the exact reporting cutoff.
3. Select **Analyse schedule**.
4. Review planned-finished leaf tasks, supported tasks and unsupported reason categories.
5. Select **Prepare Sunday candidate**.
6. Download the XML candidate and intent JSON as separate explicit downloads.
7. Open the XML in Microsoft Project.
8. Recalculate and inspect.
9. Export an XML result.
10. Save as MPP, close Project, reopen the MPP and export another XML result.
11. Compare source, candidate, first Project result and post-MPP-reopen result.

Unsupported tasks remain byte-for-byte unchanged in the browser candidate.

## Bulk candidate rules

Every supported task reuses the exact bounded completion transaction already proven by the single-task experiment.

### Task

- `PercentComplete = 100`
- `PercentWorkComplete = 100`
- Actual Start = planned Start
- Actual Finish = planned Finish
- Actual Duration = planned Duration
- Actual Work = planned Work
- Remaining Duration = zero
- Remaining Work = zero
- Stop / Resume = Actual Finish

### Existing assignment

- `PercentWorkComplete = 100`
- Actual Start / Actual Finish = task actual dates
- Actual Work = assignment Work
- Remaining Work = zero
- Stop / Resume = Actual Finish
- existing Type 1 assignment timephased work becomes Type 2 over the same UID, interval, Unit and Value

The generator does not author task Type 11. Microsoft Project owns that result-side serialization.

The generator also verifies that XML outside every selected Task and Assignment block remains byte-for-byte identical to the imported source.

## 2026-08-30 native bulk result

### Evidence hashes

Real schedule artifacts remain outside Git.

| Evidence role | SHA-256 |
|---|---|
| Untouched BOILER source | `e6a3739976580e2144352011f818c0099c0dc0c278fb37a976c5b6a55fbc3420` |
| Browser bulk candidate | `6255ee46948e893784f75fb408339d863e014905f82f1b6947ea48b3d25cd22f` |
| First Microsoft Project XML export | `0f325baae72126d668a1506ba14cdabd9d2fafc44aff19ef8ea7bab494537080` |
| Post-MPP-save/close/reopen XML export | `f6ed41e06262cf3933eee234214edc9c5d5c5a92171fda36c1bf070f3259d871` |
| Untouched-source XML → MPP → close/reopen → XML control | `844c5673bd99fac803821aeecb64ecb41bc8882d887b204be65cbd1bfbe008bd` |

Microsoft Project build recorded in the result/control XML: `16.0.20228.20186`.

### Bulk completion persistence — PASS

The browser candidate completed these 13 task UIDs:

```text
43, 318, 319, 321, 324, 323, 29, 26, 338, 337, 336, 335, 320
```

After Project import/recalculation/export and again after MPP save, close and reopen:

- all 13 remained `100%` complete and `100%` work complete;
- Actual Start / Finish remained the planned window;
- Actual Duration / Work remained equal to planned values;
- Remaining Duration / Work remained zero;
- their single assignments remained coherent and retained Type 2 actual-work timephasing;
- the five deliberately unsupported planned-finished tasks remained at zero progress;
- task count remained 555;
- assignment count remained 472;
- resource count remained 32;
- calendar count remained 45;
- Project Start remained `2026-09-13T19:00:00`;
- Project Finish remained `2026-09-24T21:00:00`;
- Status Date remained `2025-05-09T17:00:00`;
- Project Calendar UID remained `1`;
- all 600 predecessor-link semantics remained unchanged;
- task UID/ID/Name/WBS identities remained traceable;
- assignment UID/TaskUID/ResourceUID identities remained traceable;
- calendar definitions remained semantically unchanged after excluding regenerated GUID identity.

Project generated task Type 11 progress itself. Some completed tasks use a single Type 11 row while overnight/non-working-window tasks are expanded into multiple hourly rows. Tracker must not attempt to author a canonical Type 11 representation.

## Untouched-source MPP control — PASS

### Why the control was required

The progressed schedule's post-MPP-reopen result moved the Start later and shortened the Duration of ten unrelated multi-assignment tasks while keeping their Finish and Work fixed:

| Task UID | Task | Original Start | Post-MPP Start | Original Duration | Post-MPP Duration |
|---:|---|---|---|---:|---:|
| 100 | Vacuum blasting debris (FLT) | 14 Sep 02:00 | 14 Sep 07:00 | 4h | 2h |
| 106 | Vacuum blasting debris (BDV) | 14 Sep 04:00 | 14 Sep 07:00 | 4h | 2h |
| 116 | Vacuum blasting debris (Steam Drum) | 19 Sep 03:00 | 19 Sep 07:00 | 4h | 2h |
| 117 | LPW steam drum pending visual inspection | 15 Sep 02:30 | 15 Sep 07:00 | 8h | 4h |
| 164 | Vacuum blasting debris (Attemperator) | 18 Sep 23:00 | 19 Sep 07:00 | 8h | 4h |
| 181 | Vacuum blasting debris (SSIH) | 16 Sep 03:00 | 16 Sep 07:00 | 8h | 4h |
| 207 | Vacuum blasting debris (SSOH) | 18 Sep 03:00 | 18 Sep 07:00 | 8h | 4h |
| 217 | Vacuum blasting debris (PSOH) | 18 Sep 06:00 | 18 Sep 07:00 | 4h | 3h |
| 264 | Vacuum blasting debris (HS Piping) | 16 Sep 23:00 | 17 Sep 07:00 | 12h | 6h |
| 284 | LPW FD fan impeller | 13 Sep 21:00 | 14 Sep 07:00 | 8h | 4h |

The same Project build was therefore tested with the untouched source and no Tracker progress transaction.

### Control result

The untouched source was opened directly in Microsoft Project, saved as MPP, closed, reopened and exported back to XML.

It reproduced **the exact same ten task movements**.

For each of the ten tasks:

- the affected assignment was the same Resource UID `11` / `WC-OPER` assignment;
- its assignment Start/Finish moved to the same later interval;
- the task's final Start, Finish, Duration and Work exactly matched the progressed post-MPP result;
- Finish and total Work remained unchanged from the original source.

Across the whole schedule, the untouched control and the progressed post-MPP result have:

- identical task Start, Finish, Duration and Work for all 555 tasks;
- identical assignment Start, Finish and Work for all 472 assignments;
- identical `LateStart`, `LateFinish`, `TotalSlack`, `StartSlack` and `FinishSlack` values for all tasks;
- the same 555 tasks, 472 assignments, 32 resources and 45 calendars;
- the same Project Start, Project Finish, Status Date and Project Calendar UID;
- identical 600 predecessor-link semantics;
- semantically identical calendar definitions after excluding regenerated GUID identity.

The only task/assignment differences between the untouched-control result and the progressed result are therefore the intended progress/actual/remaining fields, plus a small set of expected progress-dependent Free Slack consequences.

### Timephased normalization control

The untouched source contained 2,202 timephased rows:

- 889 task Type 9 rows;
- 851 resource Type 7 rows;
- 462 assignment Type 1 rows.

After XML → MPP persistence and reopen, the untouched control contained 462 rows, all assignment Type 1, while all tasks remained at zero progress.

The progressed post-MPP result contained 510 rows:

- 449 assignment Type 1 rows;
- 13 assignment Type 2 actual-work rows;
- 48 Project-generated task Type 11 rows.

This isolates the broad removal of source task Type 9/resource Type 7 serialization as normal Project persistence behaviour and isolates the additional Type 2/Type 11 rows as the intended progress-related result.

### Classification

The ten unrelated task movements and broad derived late/slack recalculation are **baseline Microsoft Project XML → MPP persistence/recalculation normalization**, not Tracker-authored changes and not consequences unique to the bulk completion transaction.

The control therefore clears the final native blocker for the Sunday bulk-completion experiment.

## Monday 50% reporting preview

The Monday section deterministically selects half of planned-active, zero-progress work tasks and creates a downloadable JSON intent plan containing:

```text
Task UID
Task ID
Task name
WBS
planned Start
planned Finish
reportedPercent = 50
```

It remains deliberately non-exportable XML.

## Partial-progress evidence gate

Before Monday 50% intent can become an XML transaction, collect and verify one native Microsoft Project 50% reference on a simple assigned task. The evidence must establish:

- task Actual/Remaining Duration;
- task Actual/Remaining Work;
- assignment Percent Work Complete;
- assignment Actual/Remaining Work;
- Type 2 actual-work and Type 1 remaining-work timephasing;
- Stop / Resume semantics;
- task timephasing;
- MPP reopen stability.

Do not generalize the proven 100% transaction into partial progress before that evidence exists.

## Merge decision

**Native gate passed for the Sunday bulk-completion experiment.**

The tested 13-task composition may merge with its current fail-closed restrictions. This evidence does not authorize partial-progress XML, Mark on Track, Pause/Resume, off-plan actuals, multiple assignments or other task shapes outside the existing v0 boundary.