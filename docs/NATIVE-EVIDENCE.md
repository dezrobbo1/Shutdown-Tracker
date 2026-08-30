# Native Microsoft Project Evidence Register

Real schedules and generated trial artifacts remain outside Git. Record hashes and sanitized structural findings only.

## 2026-08-30 browser-generated bulk planned completion — 13 tasks

### Result

**PASS for composition of the bounded assigned-completion v0 transaction across the 13 tested BOILER tasks.**

Microsoft Project build `16.0.20228.20186` accepted the browser candidate, recalculated it, exported it, persisted it to MPP, closed/reopened the MPP, and retained all 13 intended completions.

A separate untouched-source XML → MPP → close/reopen → XML control reproduced the unrelated task/assignment schedule normalization seen in the progressed result. That normalization is therefore baseline Microsoft Project behaviour rather than a Tracker-authored or Tracker-triggered semantic change.

### Evidence hashes

| Evidence role | SHA-256 |
|---|---|
| Untouched BOILER source | `e6a3739976580e2144352011f818c0099c0dc0c278fb37a976c5b6a55fbc3420` |
| Browser bulk candidate | `6255ee46948e893784f75fb408339d863e014905f82f1b6947ea48b3d25cd22f` |
| First Project XML result | `0f325baae72126d668a1506ba14cdabd9d2fafc44aff19ef8ea7bab494537080` |
| Post-MPP-reopen Project XML result | `f6ed41e06262cf3933eee234214edc9c5d5c5a92171fda36c1bf070f3259d871` |
| Untouched-source MPP control result | `844c5673bd99fac803821aeecb64ecb41bc8882d887b204be65cbd1bfbe008bd` |

### Touched tasks

```text
43, 318, 319, 321, 324, 323, 29, 26, 338, 337, 336, 335, 320
```

After MPP reopen, all 13 retained:

- `PercentComplete = 100`;
- `PercentWorkComplete = 100`;
- planned-window Actual Start / Actual Finish;
- Actual Duration / Work equal to planned values;
- Remaining Duration / Work equal to zero;
- coherent single-assignment completion;
- assignment Type 2 actual-work timephasing.

The five deliberately unsupported planned-finished tasks remained at zero progress.

### Scheduling foundations

The progressed post-MPP result retained:

- 555 tasks;
- 472 assignments;
- 32 resources;
- 45 calendars;
- Project Start `2026-09-13T19:00:00`;
- Project Finish `2026-09-24T21:00:00`;
- Status Date `2025-05-09T17:00:00`;
- Project Calendar UID `1`;
- all 600 predecessor-link semantics;
- semantic calendar definitions, excluding regenerated GUID identity.

### Untouched-source MPP control

The post-MPP progressed result moved the Start later and shortened Duration for ten unrelated multi-assignment task UIDs:

```text
100, 106, 116, 117, 164, 181, 207, 217, 264, 284
```

The untouched-source MPP control reproduced the **same ten tasks**, the **same final Start/Finish/Duration/Work values**, and the same movement of the Resource UID `11` / `WC-OPER` assignments.

The untouched control and progressed post-MPP result have:

- identical task Start, Finish, Duration and Work across all 555 tasks;
- identical assignment Start, Finish and Work across all 472 assignments;
- identical `LateStart`, `LateFinish`, `TotalSlack`, `StartSlack` and `FinishSlack` across all tasks.

The difference between those two persisted schedules is therefore the intended progress transaction and its progress-dependent consequences, not the ten schedule-normalization movements.

### Timephased normalization

The untouched source contained 2,202 timephased rows:

- 889 task Type 9;
- 851 resource Type 7;
- 462 assignment Type 1.

The untouched MPP control persisted as 462 assignment Type 1 rows with every task still at zero progress.

The progressed post-MPP result contained 510 rows:

- 449 assignment Type 1;
- 13 assignment Type 2;
- 48 Project-generated task Type 11.

This confirms that the broad removal of source task Type 9/resource Type 7 rows is normal Project persistence serialization, while Type 2 and Type 11 are the progress-related result.

### Type 11 conclusion

The browser still does not author task Type 11. Microsoft Project generated the result itself, including multi-row hourly Type 11 representations for some overnight/non-working-window tasks. Tracker must continue treating Type 11 as Project-owned result serialization.

### Decision

Bulk composition of `assigned-completion-native-v0` is Project-verified for the 13 tested tasks and may merge with the existing fail-closed per-task eligibility boundary.

This does **not** prove partial progress, Mark on Track, Pause/Resume, off-plan actuals, multiple assignments, multiple timephased blocks or other unsupported shapes. The Monday 50% workflow remains intent-only pending a separate native partial-progress experiment.

## 2026-08-28 browser-generated assigned completion — UID 43

### Result

**PASS for the bounded assigned-completion v0 shape.**

The lightweight browser generator completed BOILER task UID `43`. Microsoft Project desktop build `16.0.20228.20188` accepted the candidate, recalculated it, saved it, and retained the completion after the user saved as MPP, closed the file, and reopened it.

This proves the current browser implementation only for the tested shape: one previously unstarted assigned leaf task, one assignment, one assignment timephased work block, 100% completion, and Actual Start/Finish equal to the planned Start/Finish.

### Evidence files

The XML files are not committed.

| Evidence role | SHA-256 |
|---|---|
| Original BOILER source | `e6a3739976580e2144352011f818c0099c0dc0c278fb37a976c5b6a55fbc3420` |
| Microsoft Project-saved browser round-trip result | `09b69b72eb02d246092f058d600019acdb03e388f64cfa7f2e9dd6c8e7ee75e6` |

The earlier handover evidence remains useful as the negative and native-reference controls:

| Evidence role | SHA-256 |
|---|---|
| Failed three-task-scalar Project resave | `e9b9b7994cc5cc50479807b82c452da742a91de9f7de52b172a6be6f4f399c70` |
| Project-authored completion reference | `9fabe70debd004aceabe749f3c13abe40823f43746d7db2b15572466c76739c7` |

### UID 43 result

Microsoft Project persisted a coherent completion:

- `PercentComplete = 100`;
- `PercentWorkComplete = 100`;
- Actual Start `2026-08-17T07:30:00`;
- Actual Finish `2026-08-17T15:30:00`;
- Actual Duration `PT8H0M0S`;
- Remaining Duration `PT0H0M0S`;
- Actual Work `PT16H0M0S`;
- Remaining Work `PT0H0M0S`;
- Stop and Resume at Actual Finish;
- assignment actual-work completion is coherent;
- Project generated direct task Type 11 progress after accepting the browser-authored transaction;
- the assignment Type 2 actual-work representation is present.

UIDs `318` and `319` remained unstarted at zero progress in this one-task trial.

### Type 11 conclusion

Direct task Type 11 timephasing is **not a required Tracker-authored input for this proven shape**. The reconciled browser writer does not author it. Microsoft Project generated it during recalculation/save.

The required browser-authored transaction for this bounded proof is therefore the task completion closure, assignment completion closure, and conversion of the existing assignment Type 1 timephased work to Type 2.

### Project-level scheduling comparison

The scheduling foundations were preserved:

| Setting | Original | Project-saved result | Classification |
|---|---|---|---|
| Project Start | `2026-09-13T19:00:00` | `2026-09-13T19:00:00` | unchanged |
| Status Date | `2025-05-09T17:00:00` | `2025-05-09T17:00:00` | unchanged |
| Project Calendar UID | `1` | `1` | unchanged |
| Default Start | `07:00` | `07:00` | unchanged |
| Default Finish | `17:00` | `17:00` | unchanged |
| Minutes per day | `600` | `600` | unchanged |
| Minutes per week | `2400` | `2400` | unchanged |
| Days per month | `20` | `20` | unchanged |
| Schedule from start | yes | yes | unchanged |
| Project Finish | `2026-09-24T21:00:00` | `2026-10-03T20:00:00` | Project-calculated consequence |
| Current Date | `2026-07-30T08:00:00` | `2026-08-28T08:00:00` | save/session metadata |

The project finish movement is not attributed to Tracker changing the project start, status date, or scheduling calendar. Those foundations remained stable while Microsoft Project recalculated the schedule.

### Calendars

The source contained 45 calendars. For calendars common to source and result, no semantic calendar-definition differences were found after excluding regenerated GUID identity. Working times, exceptions, and base-calendar relationships remained semantically stable for the common calendars.

The Project-saved result contains one additional Project-generated calendar, UID `51`, `WC-GENER`, based on calendar UID `20`. This is classified with the broader Project resource/assignment normalization and is not something the browser exporter should author.

### Wider Project consequences and normalization

The Project-saved result contains 562 tasks, 477 assignments, and 485 timephased rows, compared with 555 tasks, 472 assignments, and 2,202 timephased rows in the original source. Project therefore performed substantial recalculation and serialization normalization.

For UID `43`, Project also regenerated assignment/resource identities in the saved representation (`45` / resource `4` in the source versus `1104` / resource `36` in the saved result). These are result-side Project changes, not identities the browser writer should copy or generate.

Known Project-calculated consequences include summary roll-ups, resource work roll-ups, slack/late-date/criticality changes, and project-finish movement. Known save/session metadata includes Project GUID/name/date changes. Signed numeric zero representations such as `0.00` and `-0.00` should compare numerically.

### Stability confirmation

The user confirmed that the resulting schedule was saved as MPP, closed, reopened in Microsoft Project, and UID `43` remained completed. This satisfies the reopen stability gate for this experiment.

### Decision

`assigned-completion-native-v0` is **Microsoft Project-verified for the exact tested shape** and may be merged with its fail-closed restrictions intact.

This result does **not** prove partial progress, Mark on Track, Pause/Resume, off-plan actuals, multiple assignments, multiple timephased blocks, or arbitrary task shapes. Those remain separate native experiments.

## 2026-08-27 assigned-task completion handover evidence

### Microsoft Project environment

- Source build: `16.0.20131.20152`
- Failed resave and Project-authored reference build: `16.0.20228.20188`
- Exact Project edition/update channel/Windows version were not recorded in the handover evidence.

### Earlier evidence set

| Evidence role | Tasks | Assignments | All timephased rows |
|---|---:|---:|---:|
| Original source | 555 | 472 | 2,202 |
| Failed Tracker candidate after Project open/save | 555 | 472 | 462 |
| Project-authored completion reference | 563 | 478 | 2,227 |

The failed Project resave preserved the complete 555-task UID/ID/name/WBS/summary identity set despite changing Project GUID, establishing that Project GUID equality is not a valid strict round-trip gate by itself.

The Project-authored reference showed the coherent completion closure later used to design v0. Subsequent comparison with the independently Project-proven `Shutdown-Tracker-Claude` candidate established that direct task Type 11 should be treated as Project-generated result evidence rather than required authored input.

## Entry template

### Experiment ID

`YYYY-MM-DD-short-name`

### Microsoft Project environment

- Edition:
- Version:
- Build:
- Update channel:
- Windows version:
- Project file scheduling mode:

### Source

- Sanitized description:
- Source SHA-256:
- Task UID:
- Task ID:
- Assigned or unassigned:
- Assignment count:
- Planned Start:
- Planned Finish:
- Duration:
- Work:
- Status Date:

### Native action

Describe the exact ribbon command or field entry used in Microsoft Project.

### Files compared

- source XML SHA-256:
- candidate XML SHA-256:
- Project-saved result XML SHA-256:
- MPP reopen confirmed:

### Observed task changes

List task fields that changed.

### Observed assignment changes

List assignment fields that changed.

### Observed timephased changes

List timephased types/values that changed.

### Project scheduling foundations

Record Project Start, Status Date, calendar identity/semantics, default working times, and any other scheduling controls that changed or remained stable.

### Wider Project consequences

Record summary, successor, resource, project-finish, work, criticality, slack, calendar, or other changes.

### Reopen result

- Opened successfully:
- Saved successfully:
- Reopened MPP stably:
- Progress displayed as intended:
- Contradictions observed:

### Classification

Separate approved input, semantic companions, Project-calculated consequences, serialization normalization, and unexpected differences.

### Decision

State the exact task shape proven, whether the profile may merge, and which cases remain unproven.
