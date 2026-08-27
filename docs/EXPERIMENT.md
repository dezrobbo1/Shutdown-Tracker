# Current Experiment

## Objective

Determine the native Microsoft Project XML transaction required to represent assigned-task execution progress coherently.

## User trial

1. Export a disposable schedule from Microsoft Project as XML.
2. Import it into the browser lab.
3. Record execution events on one or more executable leaf tasks.
4. Generate a candidate using one explicitly labelled profile.
5. Open the candidate in the same identified Microsoft Project desktop build.
6. Allow Project to recalculate.
7. Save As a separate XML file.
8. Import the Project-saved result into the lab.
9. Review source, candidate and result values.
10. Record the outcome in `NATIVE-EVIDENCE.md` without committing real schedule files.

## Required first native cases

Run each case separately on an assigned task with non-zero Work:

- open and save without edits;
- Actual Start only;
- Mark on Track through a controlled status date/time;
- partial progress at 50% or 75%;
- Finish / 100% complete;
- Skip to the planned finish;
- expected progress at shift end.

Also repeat partial progress and completion on an unassigned task so assignment effects can be isolated.

## Evidence classifications

| Classification | Meaning |
|---|---|
| Approved input | The execution fact entered or selected by the user |
| Required semantic companion | Dependent state needed to express that input coherently in XML |
| Project-calculated consequence | State changed by Microsoft Project after opening/recalculation |
| Serialization normalization | Formatting, ordering or volatile output written by Project |
| Unexpected difference | A difference requiring further investigation |

## Stop condition

Do not rebuild backend, approvals, roles, Mobile, reporting or production persistence until one assigned-task partial-progress case and one assigned-task completion case reopen and save coherently in Microsoft Project.
