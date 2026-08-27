# Current Experiment

## Objective

Determine whether the evidence-derived Microsoft Project XML transaction can complete one real assigned task coherently.

The repository is an evidence laboratory. It imports source XML, records execution intent, generates explicitly labelled candidates, accepts Microsoft Project-saved results or Project-authored reference schedules, and compares task, assignment, timephased, summary, project, and wider changed-task facts.

Draft PR #75 implements one experimental writer:

```text
assigned-completion-native-v0
```

It is not approved as a native-semantic transaction. The deployed `main` registry does not expose it while the native trial is pending.

## Result classifications

### Strict candidate result

A file is a strict result when:

- every candidate task UID is present in the result;
- no extra result task UID is present;
- each common task retains the same ID, name, WBS, and summary/leaf status; and
- every touched task retains that exact identity fingerprint.

Project UID, GUID, and name changes are reported as evidence and warnings. A Project GUID change alone is not a rejection condition because the supplied failed Project resave changed Project GUID while preserving the complete task identity set.

### Reference schedule

A file is accepted as a reference schedule when every touched task retains its exact task identity fingerprint but the broader task population or common-task fingerprints differ.

Reference schedules are useful for studying how Microsoft Project writes a native operation. They must not be presented as the result of the generated candidate.

### Rejected result

A file is rejected when a touched task is missing or its UID/ID/name/WBS/summary identity does not match the candidate.

## Evidence classifications

| Classification | Meaning |
|---|---|
| Approved input | The execution fact entered or selected by the user |
| Required semantic companion | Dependent state needed to express that input coherently in XML |
| Project-calculated consequence | State changed by Microsoft Project after opening/recalculation |
| Serialization normalization | Formatting, ordering, identity, or volatile output written by Project |
| Unexpected difference | A difference requiring further investigation |

## Implemented v0 boundary

The writer fails closed unless:

- exactly one task is touched;
- the task is active, non-null, non-summary, and unstarted;
- task Duration and Work are positive;
- task remaining Duration and Work equal planned Duration and Work;
- the task has exactly one assignment;
- the assignment has a non-zero Resource UID;
- assignment Work, Start, and Finish align with the task;
- the assignment is unstarted and has full Remaining Work;
- the assignment contains exactly one Unit 1, Type 1 timephased row matching its UID, interval, and Work value;
- execution history contains exactly one Start and one Finish or Skip to planned finish event; and
- Actual Start equals planned Start and Actual Finish equals planned Finish.

The writer changes only the selected Task and Assignment blocks and verifies that all remaining source XML is byte-for-byte unchanged.

Pause, Resume, observed percentage, Mark on Track, shift-end progress, off-plan dates, split tasks, multiple assignments, partial progress, and already-progressed tasks are outside v0.

## Evidence-derived completion shape

For the task:

- `PercentComplete = 100`;
- `PercentWorkComplete = 100`;
- Actual Start and Actual Finish equal the planned window;
- Actual Duration equals Duration;
- Remaining Duration equals zero;
- Actual Work equals Work;
- Remaining Work equals zero;
- Stop and Resume equal Actual Finish;
- one direct task Type 11 timephased row with Unit 2 and Value 100.

For the existing source assignment:

- `PercentWorkComplete = 100`;
- Actual Start and Actual Finish equal the task actual dates;
- Actual Work equals assignment Work;
- Remaining Work equals zero;
- Stop and Resume equal Actual Finish;
- the existing Type 1 assignment timephased row becomes Type 2 while preserving source assignment UID, Resource UID, interval, Unit, and Value.

The writer does not independently alter Project GUID, task GUID, assignment UID, Resource UID, summary progress, slack, criticality, early/late dates, successor dates, project finish, tasks, resources, calendars, dependencies, or baselines.

## First native completion trial

Trial only BOILER task UID `43`:

```text
source XML
→ assigned-completion-native-v0 candidate
→ open in Microsoft Project build 16.0.20228.20188
→ recalculate
→ Save As XML
→ close and reopen the saved result
→ import the result into the lab
```

Exact user steps are in `ASSIGNED-COMPLETION-NATIVE-V0-TRIAL.md`.

Pass conditions:

- task displays 100% complete;
- Actual Start is `2026-08-17T07:30:00`;
- Actual Finish is `2026-08-17T15:30:00`;
- Actual Duration equals `PT8H0M0S`;
- Remaining Duration equals zero;
- assignment Actual Work equals `PT16H0M0S`;
- assignment Remaining Work equals zero;
- task Type 11 and assignment Type 2 evidence survive or are coherently normalized by Project;
- no contradictory remaining work or duration remains;
- source task, assignment, and resource identities remain attributable;
- the source file remains unchanged; and
- the Project-saved result reopens stably.

Only after UID `43` passes should the same profile be tried on UIDs `318` and `319`.

## Later native cases

After the completion case is proven, separately investigate:

- Actual Start only;
- Mark on Track through a controlled status date/time;
- partial progress at 50% or 75%;
- off-plan completion;
- pause/resume;
- multiple assignments; and
- unassigned tasks.

## Stop condition

Do not merge PR #75, expand the writer, or rebuild backend, approvals, roles, Mobile, reporting, messaging, or production persistence until task UID `43` passes the Microsoft Project open, recalculate, save, close, reopen, and result-import trial.
