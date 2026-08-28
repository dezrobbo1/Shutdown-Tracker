# Assigned-task completion native-evidence v0 confirmation trial

## Status

The completion transaction shape is now Microsoft Project-proven in the companion `Shutdown-Tracker-Claude` repository for BOILER task UID `43` on Project desktop build `16.0.20228.20188`.

This PR still requires one native confirmation because the browser implementation is separate code. The purpose of the trial is no longer to discover the transaction; it is to confirm that this lightweight JavaScript generator reproduces the proven shape correctly.

## Evidence basis

The Project-proven candidate authors:

### Task

- `PercentComplete = 100`;
- `PercentWorkComplete = 100`;
- Actual Start and Actual Finish;
- Actual Duration = planned Duration;
- Actual Work = planned Work;
- Remaining Duration and Remaining Work = zero;
- Stop and Resume = Actual Finish.

### Existing assignment

- `PercentWorkComplete = 100`;
- Actual Start and Actual Finish;
- Actual Work = planned assignment Work;
- Remaining Work = zero;
- Stop and Resume = Actual Finish;
- the existing Type 1 assignment timephased work block changes to Type 2 with the same source UID, interval, Unit, and Value.

The Project-authored reference also contains direct task Type 11 progress. However, the proven Claude candidate did not directly author that row and Microsoft Project still accepted the transaction. PR #75 therefore no longer adds task Type 11 itself. If Project adds or normalizes Type 11 during recalculation/save, that is result evidence.

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

Pause, Resume, observed percentage, Mark on Track, shift-end progress, off-plan actuals, split tasks, multiple assignments, partial progress, and already-progressed tasks remain outside v0.

## Confirmation trial

Use the original BOILER source and task UID `43` only.

1. Open the deployed lab for PR #75.
2. Import the untouched BOILER XML source.
3. Search for UID `43` and select `Conduct all pre-work scaffold lifts`.
4. Set trial time to `2026-08-17 07:30`.
5. Select **Start**.
6. Select **Skip to planned finish**. This records completion at `2026-08-17 15:30`.
7. Choose **Assigned completion at planned window — Project-proven shape, browser confirmation pending**.
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
- assignment timephased work remains/coherently normalizes as Type 2 actual work;
- no contradictory remaining work or duration is present;
- any task Type 11 row is Project-generated/result state rather than required Tracker-authored input;
- task UID/ID/name/WBS/summary identity remains stable;
- summary/resource/slack/criticality changes are consistent with Project recalculation rather than hidden Tracker edits;
- the Project-saved result reopens without losing the intended progress; and
- the imported source file remains unchanged.

## Known comparison normalization

Do not treat these by themselves as a failed round trip:

- project Name, GUID, LastSaved, and CurrentDate changing on Project save;
- `0.00` versus `-0.00` representation when the numeric value is equal;
- summary ancestor roll-up;
- affected resource Percent Work Complete / Actual Work / Remaining Work roll-up;
- recalculated slack, late dates, or Critical state.

## Stop conditions

Do not expand the profile to another task, partial progress, Mark on Track, multiple assignments, or a broader workflow until this browser implementation passes the UID `43` confirmation trial.
