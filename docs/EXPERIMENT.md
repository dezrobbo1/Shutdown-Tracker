# Current Experiment

## Objective

Confirm that the lightweight browser implementation reproduces the Microsoft Project-proven assigned-task completion transaction, then continue native evidence work for partial progress and other execution actions.

The current repository remains an evidence laboratory. It imports source XML, records execution intent, generates explicitly labelled candidates, accepts Microsoft Project-saved results or Project-authored reference schedules, and compares task, assignment, timephased, summary, project, and wider changed-task facts.

## What is now proven elsewhere

The companion `Shutdown-Tracker-Claude` repository has a completed manual Microsoft Project round trip for BOILER task UID `43` using Project desktop build `16.0.20228.20188`.

For the evidenced single-assignment, single-timephased-block shape, the accepted candidate authors:

- task Percent Complete / Percent Work Complete = 100;
- task Actual Start / Actual Finish;
- task Actual Duration / Actual Work = planned values;
- task Remaining Duration / Remaining Work = zero;
- task Stop / Resume = Actual Finish;
- assignment Percent Work Complete = 100;
- assignment Actual Start / Actual Finish;
- assignment Actual Work = planned assignment Work;
- assignment Remaining Work = zero;
- assignment Stop / Resume = Actual Finish;
- assignment TimephasedData Type 1 → Type 2 over the same source interval, Unit and Value.

The proven candidate does **not** directly add task Type 11 timephasing. Project-authored/reference files may contain Type 11 after recalculation/save, so that row is treated as Project result state rather than required Tracker-authored input.

## Browser confirmation trial

Draft PR #75 implements the separate browser generator:

```text
assigned-completion-native-v0
```

It remains draft because this JavaScript implementation still needs one Microsoft Project confirmation.

1. Import the untouched BOILER source in PR #75.
2. Select task UID `43`.
3. Record Start at the imported planned Start.
4. Skip to the imported planned Finish.
5. Generate `assigned-completion-native-v0`.
6. Open the candidate in Microsoft Project build `16.0.20228.20188`.
7. Recalculate and Save As a separate XML file.
8. Close and reopen the saved file.
9. Import the Project-saved result into the lab.
10. Compare source, browser candidate and Project result.

This is an implementation-confirmation test, not a discovery experiment.

## Result classifications

### Strict candidate result

A file is a strict result when:

- every candidate task UID is present in the result;
- no extra result task UID is present;
- each common task retains the same ID, name, WBS, and summary/leaf status; and
- every touched task retains that exact identity fingerprint.

Project UID, GUID, and name changes are reported as evidence and warnings. A Project GUID change alone is not a rejection condition.

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
| Serialization normalization | Formatting, ordering, identity, save metadata, or value representation written by Project |
| Unexpected difference | A difference requiring further investigation |

Known Project-result semantics from the proven UID `43` round trip are codified in `src/project-result-semantics.js`, including save metadata normalization, numeric signed-zero equivalence, summary/resource roll-ups, and task slack/late-date/Critical recalculation.

## Implemented v0 boundary

The browser writer fails closed unless:

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

## Next native evidence after completion confirmation

Run each new case separately before implementing general support:

- Actual Start only;
- Mark on Track through a controlled status date/time;
- partial progress at 50% or 75%;
- expected progress at shift end;
- off-plan completion;
- multiple assignments;
- multiple timephased blocks.

Partial assigned-task progress remains blocked until a native sample shows how Project divides actual versus remaining timephased work and how Stop / Resume behave.

## Stop condition

Do not rebuild backend, approvals, roles, Mobile, reporting, messaging, or production persistence in this lightweight repository while the interoperability evidence is still being established. Use the Claude repository as a donor/reference source rather than importing its large platform architecture wholesale.
