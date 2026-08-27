# Current Experiment

## Objective

Determine the native Microsoft Project XML transaction required to represent assigned-task execution progress coherently.

The current repository is an evidence laboratory. It imports source XML, records execution intent, generates explicitly labelled candidates, accepts Microsoft Project-saved results or Project-authored reference schedules, and compares task, assignment, timephased, summary, project, and wider changed-task facts.

It does not yet contain an approved native-semantic completion writer.

## User trial

1. Export a disposable schedule from Microsoft Project as XML.
2. Import it into the browser lab.
3. Record execution events on one or more executable leaf tasks.
4. Generate a candidate using one explicitly labelled profile.
5. Open the candidate in the same identified Microsoft Project desktop build.
6. Allow Project to recalculate.
7. Save As a separate XML file.
8. Import the Project-saved result into the lab.
9. Review source, candidate, and result values.
10. Record the outcome in `NATIVE-EVIDENCE.md` without committing real schedule files.

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

## Required native cases

Run each case separately on an assigned task with non-zero Work:

- unchanged open/save baseline;
- Actual Start only;
- Mark on Track through a controlled status date/time;
- partial progress at 50% or 75%;
- Finish / 100% complete;
- Skip to the planned finish;
- expected progress at shift end.

Also repeat partial progress and completion on an unassigned task so assignment effects can be isolated.

## Next bounded implementation

After the reset PR merges, the first implementation PR should add one profile only:

```text
assigned-task-completion-native-v0
```

Label it:

> Native-evidence-derived experimental profile — not yet Project-verified.

The profile should initially fail closed unless the task:

- is an active leaf;
- has exactly one assignment;
- has non-zero Duration;
- has non-zero Work;
- has valid Start and Finish values;
- has no contradictory pre-existing actuals; and
- has the source assignment and timephased shape supported by the evidence.

The profile must preserve source task UID, task GUID, assignment UID, Resource UID, dependencies, calendars, baselines, and all unrelated XML content. It must not copy regenerated identifiers or calculated schedule fields from the Project-authored reference.

### Evidence-derived task completion shape

For a completed assigned task, the first experimental profile should reproduce only the repeated Project-authored completion facts:

- `PercentComplete = 100`;
- `PercentWorkComplete = 100`;
- approved Actual Start and Actual Finish;
- Actual Duration equal to full Duration;
- Remaining Duration equal to zero;
- Actual Work equal to full Work;
- Remaining Work equal to zero;
- Stop and Resume equal to Actual Finish;
- one direct task Type 11 timephased progress row with Unit 2 and Value 100.

For the existing source assignment:

- `PercentWorkComplete = 100`;
- Actual Start and Actual Finish equal to the task actual dates;
- Actual Work equal to full assignment Work;
- Remaining Work equal to zero;
- Stop and Resume equal to Actual Finish;
- source Type 1 assignment timephased work transformed to Type 2 actual work while retaining the source assignment UID, Resource UID, interval, unit, and value.

Do not independently write summary progress, slack, criticality, early/late dates, successor dates, project finish, Project GUID, task GUID, assignment UID, Resource UID, new tasks, or new assignments.

## First native completion trial

Trial only task UID `43` first:

```text
source XML
→ assigned-task-completion-native-v0 candidate
→ open in Microsoft Project build 16.0.20228.20188
→ recalculate
→ Save As XML
→ reopen the saved XML
→ import the result into the lab
```

Pass conditions:

- task displays 100% complete;
- task actual dates are correct;
- Actual Duration equals Duration;
- Remaining Duration equals zero;
- assignment displays 100% work complete;
- Actual Work equals Work;
- Remaining Work equals zero;
- task Type 11 and assignment Type 2 timephased evidence survive or are coherently normalized by Project;
- no contradictory remaining work remains;
- the source file remains unchanged; and
- the Project-saved result reopens stably.

Only after UID `43` passes should the same profile be tried on UIDs `318` and `319`.

## Stop condition

Do not rebuild backend, approvals, roles, Mobile, reporting, messaging, or production persistence until one assigned-task partial-progress case and one assigned-task completion case reopen and save coherently in Microsoft Project.
