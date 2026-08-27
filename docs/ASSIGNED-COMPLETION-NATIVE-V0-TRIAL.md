# Assigned-task completion native-evidence v0 trial

## Status

Implemented as an experimental browser export profile. It is not yet Microsoft Project-verified and must not be treated as a production or approved native-semantic transaction.

## Evidence basis

The profile reproduces only the repeated completion facts observed for matching assigned task UIDs `43`, `318`, and `319` in the supplied Microsoft Project-authored reference:

- task and work completion at 100%;
- Actual Start and Actual Finish;
- full Actual Duration and Actual Work;
- zero Remaining Duration and Remaining Work;
- task and assignment Stop/Resume at Actual Finish;
- direct task Type 11 progress with Unit 2 and Value 100; and
- assignment Type 1 timephased work changed to Type 2 actual work while retaining source identity, interval, unit, and value.

The profile does not copy Project GUIDs, task GUIDs, assignment UIDs, Resource UIDs, summary progress, slack, criticality, dates on other tasks, project finish, or additional tasks/assignments from the reference schedule.

## Deliberate v0 boundary

The profile fails closed unless:

- exactly one task is touched;
- the task is active, non-null, non-summary, and unstarted;
- task Duration and Work are positive;
- task remaining Duration and Work equal planned Duration and Work;
- the task has exactly one assignment;
- assignment Work, Start, and Finish align with the task;
- the assignment is unstarted and has full Remaining Work;
- the assignment contains exactly one Type 1 timephased row matching its UID, interval, Unit, and Work value;
- execution history contains exactly one Start and one Finish or Skip to planned finish event; and
- Actual Start equals planned Start and Actual Finish equals planned Finish.

Pause, Resume, observed percentage, Mark on Track, shift-end progress, off-plan actuals, split tasks, multiple assignments, partial progress, and already-progressed tasks are outside v0.

## First native trial

Use the original BOILER source and task UID `43` only.

1. Open the deployed lab for this branch.
2. Import the untouched BOILER XML source.
3. Search for UID `43` and select `Conduct all pre-work scaffold lifts`.
4. Set trial time to `2026-08-17 07:30`.
5. Select **Start**.
6. Select **Skip to planned finish**. This records completion at `2026-08-17 15:30`.
7. Choose **Assigned completion at planned window — native-evidence v0**.
8. Download the candidate XML and execution log JSON.
9. Open the candidate in Microsoft Project build `16.0.20228.20188`.
10. Allow Project to recalculate, inspect task UID `43`, and save as a separate XML file.
11. Close and reopen the saved file to test stability.
12. Import the Project-saved XML into the lab as the result.
13. Record the result and hashes in `docs/NATIVE-EVIDENCE.md`.

## Pass conditions

- UID `43` displays 100% complete;
- Actual Start is `2026-08-17T07:30:00`;
- Actual Finish is `2026-08-17T15:30:00`;
- Actual Duration equals `PT8H0M0S`;
- Remaining Duration equals `PT0H0M0S`;
- assignment Actual Work equals `PT16H0M0S`;
- assignment Remaining Work equals `PT0H0M0S`;
- no contradictory remaining work or duration is present;
- task Type 11 and assignment Type 2 evidence survives or is coherently normalized by Project;
- task UID/ID/name/WBS/summary identity remains stable;
- the Project-saved result reopens without losing the intended progress; and
- the imported source file remains unchanged.

## Stop conditions

Do not expand the profile to another task, partial progress, Mark on Track, multiple assignments, or a broader workflow until UID `43` passes the full open/save/reopen trial.
