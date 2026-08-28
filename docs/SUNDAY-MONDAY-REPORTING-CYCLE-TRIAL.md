# Sunday → Monday Reporting-Cycle Trial

## Status

Experimental multi-task composition trial.

The underlying `assigned-completion-native-v0` transaction is Microsoft Project-verified for one BOILER task with one assignment and one timephased work block. This experiment asks a new question: can that already-proven transaction be composed safely across every eligible task planned to be complete by a reporting cutoff?

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
5. Select **Generate Sunday candidate**.
6. The lab downloads:
   - a separate complete-source XML candidate; and
   - a JSON execution-intent record containing the cutoff, supported UIDs and unsupported reasons.
7. Open the candidate in Microsoft Project desktop build `16.0.20228.20188`.
8. Recalculate.
9. Inspect the schedule and save as a separate XML/MPP candidate.
10. Close and reopen the MPP to verify stability.
11. Import the Project-saved XML back into the trial page.

### Source preflight examples

The untouched BOILER schedule currently produces these counts under the exact strict v0 eligibility rules used by the bulk planner. These are examples only; use the actual shift cutoff for the trial.

| Reporting cut | Planned-finished leaf tasks | Supported v0 completions | Left unchanged |
|---|---:|---:|---:|
| 13 Sep 2026 23:59 | 62 | 48 | 14 |
| 14 Sep 2026 07:00 | 65 | 51 | 14 |
| 14 Sep 2026 18:00 | 159 | 136 | 23 |

Unsupported tasks remain byte-for-byte unchanged. Typical reasons in the real schedule include milestones/non-positive duration, multiple assignment timephased rows, multiple assignments and other shapes outside the existing proof.

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

The generator does not author task Type 11. Microsoft Project generated Type 11 itself in the successful single-task round trip.

The bulk generator verifies that XML outside all selected Task and Assignment blocks remains byte-for-byte identical to the imported source.

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
- the saved MPP reopens stably.

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

Do not merge the bulk-composition experiment merely because automated tests pass. Keep the PR draft until one real Sunday cutoff candidate has been opened, recalculated, saved and reopened in Microsoft Project and the Project-saved result has been reviewed.
