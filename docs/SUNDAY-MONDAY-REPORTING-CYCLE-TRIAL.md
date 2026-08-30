# Sunday → Monday Reporting-Cycle Trial

## Status

Experimental multi-task composition trial.

The underlying `assigned-completion-native-v0` transaction is Microsoft Project-verified for one BOILER task with one assignment and one timephased work block. This experiment asks a new question: can that already-proven transaction be composed safely across every eligible task planned to be complete by a reporting cutoff?

The Sunday bulk transaction has now passed the **13-task completion persistence** portion of its native trial, including MPP save/close/reopen. A separate control is still required before merge because Microsoft Project changed ten unrelated multi-assignment task starts/durations during the XML → MPP → reopen cycle. The control must determine whether that is baseline Microsoft Project normalization or a consequence specific to the progressed candidate.

The Monday 50% portion is intentionally **intent-only**. No partial-progress XML is generated until a native 50% assigned-task reference has been collected and verified.

## Trial page

Use the dedicated browser-local page:

```text
/src/bulk-trial.html
```

The main single-task lab remains available separately.

## Sunday planned-completion simulation

1. Import the untouched BOILER XML source.
2. Enter the exact end-of-shift Sunday reporting cutoff. Do not infer the shift boundary from the calendar date.
3. Select **Analyse schedule**.
4. Review:
   - leaf tasks whose planned Finish is at or before the cutoff;
   - tasks supported by the already-proven v0 shape;
   - unsupported tasks and their reason categories.
5. Select **Prepare Sunday candidate**.
6. Download separately:
   - the complete-source Sunday XML candidate; and
   - the JSON execution-intent record containing the cutoff, supported UIDs and unsupported reasons.
7. Open the candidate in Microsoft Project desktop.
8. Recalculate.
9. Inspect the schedule and export/save a separate XML result.
10. Save as MPP, close Microsoft Project, reopen the MPP, then export another XML result.
11. Compare source, candidate, first Project XML result and post-MPP-reopen XML result.

### Source preflight examples

The untouched BOILER schedule currently produces these counts under the exact strict v0 eligibility rules used by the bulk planner. These are examples only; use the actual shift cutoff for the trial.

| Reporting cut | Planned-finished leaf tasks | Supported v0 completions | Left unchanged |
|---|---:|---:|---:|
| 13 Sep 2026 23:59 | 62 | 48 | 14 |
| 14 Sep 2026 07:00 | 65 | 51 | 14 |
| 14 Sep 2026 18:00 | 159 | 136 | 23 |

Unsupported tasks remain byte-for-byte unchanged in the browser candidate. Typical reasons in the real schedule include milestones/non-positive duration, multiple assignment timephased rows, multiple assignments and other shapes outside the existing proof.

## Bulk candidate rules

For every supported task, the generator reuses the exact bounded transaction already proven in Microsoft Project:

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
- existing Type 1 timephased block becomes Type 2 over the same UID, interval, Unit and Value

The generator does not author task Type 11. Microsoft Project generated Type 11 itself in the successful single-task and bulk round trips.

The bulk generator verifies that XML outside all selected Task and Assignment blocks remains byte-for-byte identical to the imported source.

## 2026-08-30 native bulk result

### Evidence hashes

Real schedule artifacts remain outside Git.

| Evidence role | SHA-256 |
|---|---|
| Untouched BOILER source | `e6a3739976580e2144352011f818c0099c0dc0c278fb37a976c5b6a55fbc3420` |
| Browser bulk candidate | `6255ee46948e893784f75fb408339d863e014905f82f1b6947ea48b3d25cd22f` |
| Microsoft Project XML export before MPP reopen | `0f325baae72126d668a1506ba14cdabd9d2fafc44aff19ef8ea7bab494537080` |
| Microsoft Project XML export after MPP save/close/reopen | `f6ed41e06262cf3933eee234214edc9c5d5c5a92171fda36c1bf070f3259d871` |

Microsoft Project build recorded in both result XML files: `16.0.20228.20186`.

### Bulk completion persistence — PASS

The candidate touched these 13 supported task UIDs:

```text
43, 318, 319, 321, 324, 323, 29, 26, 338, 337, 336, 335, 320
```

After Project import/recalculation/export and again after saving as MPP, closing, reopening and exporting:

- all 13 remained `100%` complete and `100%` work complete;
- all 13 retained their planned Actual Start and Actual Finish;
- Actual Duration/Work remained equal to planned Duration/Work;
- Remaining Duration/Work remained zero;
- their single assignments retained coherent 100% completion and Type 2 actual-work timephasing;
- the five unsupported planned-finished tasks remained at zero progress;
- task count remained 555;
- assignment count remained 472;
- resource count remained 32;
- calendar count remained 45;
- Project Start remained `2026-09-13T19:00:00`;
- Project Finish remained `2026-09-24T21:00:00`;
- Status Date remained `2025-05-09T17:00:00`;
- Project Calendar UID remained `1`;
- all predecessor-link semantics remained unchanged;
- common calendar definitions remained semantically unchanged, excluding Project-regenerated GUID identity.

Project-generated task Type 11 serialization persisted. In the bulk result, some tasks use a simple single Type 11 row while overnight/non-working-window tasks are expanded into multiple hourly rows. Tracker must continue treating Type 11 as Project-owned result serialization rather than authoring a canonical form.

### MPP reopen control finding — unresolved

The MPP save/close/reopen step revealed a separate schedule-normalization effect outside the 13 touched tasks.

Compared with the first Project XML export, the post-MPP-reopen XML changed the Start and Duration of ten **untouched multi-assignment tasks** while retaining their Finish and Work:

| Task UID | Task | Start before MPP reopen | Start after MPP reopen | Duration before | Duration after |
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

For each of those tasks, the affected assignment is the Resource UID `11` / `WC-OPER` assignment. Microsoft Project moved that assignment's Start/Finish and its Type 1 timephased interval to align with the later assignment window. The task Finish and total Work remained unchanged.

Project also recalculated derived late/slack fields widely between the first XML export and the post-MPP-reopen export: 536 `LateStart`, 534 `LateFinish`, 510 `TotalSlack`, 515 `StartSlack` and 520 `FinishSlack` values changed. Project/task/calendar/assignment GUIDs were regenerated as save identity.

These changes happened **after** the browser transaction had already been accepted and exported by Project, during the later MPP persistence/reopen cycle. They are therefore not browser-authored fields. However, they affect unrelated schedule data and must be isolated before the PR can merge.

### Required baseline control

Before merging this PR, perform one control with **no Tracker progress transaction**:

1. open the untouched BOILER source XML directly in the same Microsoft Project build;
2. save it as MPP;
3. close Microsoft Project;
4. reopen the saved MPP;
5. export XML;
6. compare the same ten multi-assignment tasks, assignment UID/resource identities, Project Start/Finish/Status Date, calendars and late/slack fields.

Decision rule:

- if the untouched control produces the same ten task/assignment shifts, classify them as baseline Microsoft Project XML → MPP normalization and keep them out of the Tracker-authored semantic delta;
- if the untouched control does **not** produce the same shifts, treat the bulk candidate as having triggered an unintended recalculation consequence and do not merge until explained.

## Sunday pass conditions

- every supported touched task remains coherently 100% complete after Project recalculation/save;
- no touched task retains contradictory Remaining Duration or Remaining Work;
- touched assignment progress remains coherent;
- unsupported tasks are not authored by the browser;
- source task identity remains traceable;
- Project Start remains unchanged;
- Status Date remains unchanged unless the user deliberately changes it in Project;
- common calendar semantics remain stable;
- Project Finish movement, summary roll-up, resource roll-up, slack/criticality changes and Project-generated serialization are treated as Project-calculated/result-side evidence rather than hidden Tracker inputs;
- the saved MPP reopens with all intended completions intact;
- any unrelated MPP-reopen schedule movement is shown to occur in an untouched baseline control before it is classified as normal Project behavior.

## Monday 50% reporting preview

After choosing the Monday reporting cutoff, select **Preview half reported at 50%**.

The page deterministically selects half of the planned-active, zero-progress work tasks and creates a downloadable JSON intent plan:

```text
Task UID
Task ID
Task name
WBS
planned Start
planned Finish
reportedPercent = 50
```

This is deliberately **not exportable XML**.

## Partial-progress evidence gate

Before the Monday 50% intent plan can become an XML transaction, create one native Microsoft Project reference on a simple assigned task:

1. start from an untouched assigned task with non-zero Work;
2. enter 50% progress natively in Microsoft Project;
3. save as XML;
4. compare task Actual/Remaining Duration and Work;
5. compare assignment Percent Work Complete / Actual Work / Remaining Work;
6. inspect how assignment timephased work is split between Type 2 actual work and Type 1 remaining work;
7. inspect Stop / Resume and task timephasing;
8. reopen the saved result to verify stability.

Only after that evidence exists should a bounded partial-progress writer be implemented and the combined Sunday-complete + Monday-half-reported candidate be generated.

## Merge gate

Do not merge the bulk-composition experiment merely because automated tests pass. The 13-task completion transaction has passed Project import/recalculation/export and MPP save/close/reopen persistence, but PR #77 must remain draft until the untouched-source MPP baseline control resolves the ten unrelated multi-assignment task shifts described above.
