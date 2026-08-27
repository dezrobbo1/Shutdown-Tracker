# Native Microsoft Project Evidence Register

No transaction profile is currently approved as a native-semantic Project progress transaction.

Add one text-only entry for every native experiment. Do not commit real schedules, screenshots containing sensitive data, generated XML artifacts, local paths, user names or commercial information.

## 2026-08-27 assigned-task completion handover evidence

### Microsoft Project environment

- Edition: not recorded in the handover evidence
- Version: Microsoft Project desktop, exact edition not recorded
- Source build: `16.0.20131.20152`
- Failed resave and Project-authored reference build: `16.0.20228.20188`
- Update channel: not recorded
- Windows version: not recorded
- Project file scheduling mode: not recorded

### Evidence set

The schedule files remain outside Git. Only hashes and sanitized structural observations are recorded.

| Evidence role | SHA-256 | Tasks | Assignments | All timephased rows |
|---|---|---:|---:|---:|
| Original source | `e6a3739976580e2144352011f818c0099c0dc0c278fb37a976c5b6a55fbc3420` | 555 | 472 | 2,202 |
| Failed Tracker candidate after Project open/save | `e9b9b7994cc5cc50479807b82c452da742a91de9f7de52b172a6be6f4f399c70` | 555 | 472 | 462 |
| Project-authored completion reference | `9fabe70debd004aceabe749f3c13abe40823f43746d7db2b15572466c76739c7` | 563 | 478 | 2,227 |

Timephased parent distribution:

| Evidence role | Task rows | Resource rows | Assignment rows |
|---|---:|---:|---:|
| Original source | 889 | 851 | 462 |
| Failed Project resave | 0 | 0 | 462 |
| Project-authored completion reference | 892 | 851 | 484 |

The Project GUID changed in all three files. The failed Project resave nevertheless preserved the complete 555-task UID/ID/name/WBS/summary identity set. Project GUID equality is therefore not a valid strict round-trip gate by itself.

### Native action

The handover states that matching assigned tasks were manually completed in Microsoft Project. The exact ribbon command or field-entry sequence was not recorded, so this entry does not claim a more specific native action.

### Matching task evidence

Common task UIDs `43`, `318`, and `319` repeat the same Project-authored completion pattern:

- task `PercentComplete = 100`;
- task `PercentWorkComplete = 100`;
- task Actual Start and Actual Finish populated;
- task Actual Duration equals full task Duration;
- task Remaining Duration equals zero;
- task Actual Work equals full Work;
- task Remaining Work equals zero;
- task Stop and Resume equal Actual Finish;
- one direct task `TimephasedData` row with `Type = 11`, `Unit = 2`, and `Value = 100`;
- assignment `PercentWorkComplete = 100`;
- assignment Actual Start and Actual Finish populated;
- assignment Actual Work equals full assignment Work;
- assignment Remaining Work equals zero;
- assignment Stop and Resume equal Actual Finish;
- assignment timephased work changes from `Type = 1` in the source to `Type = 2` in the Project-authored reference while retaining the work value and interval.

The failed Tracker/Project-resaved file leaves the same three tasks at zero progress with full remaining duration and work. It is the negative control for the disproved three-task-scalar mechanism.

### Identity and wider differences

The Project-authored completion reference is not a strict candidate result:

- it contains eight more tasks and six more assignments than the source;
- some source tasks are absent and other tasks are added;
- task GUIDs, assignment UIDs, and resource assignment identities differ;
- the overall schedule finish and other calculated schedule facts move.

Those wider differences must not be copied into an exporter. The source task UID, assignment UID, and Resource UID remain the identities to preserve in the next experiment.

### Classification

- **Approved input:** completion intent and actual start/finish facts for the selected tasks.
- **Required semantic companions indicated by evidence:** task and assignment percent-work completion, actual/remaining duration and work, Stop/Resume, task Type 11 timephased progress, and assignment Type 2 actual work.
- **Project-calculated consequences:** summary, successor, project-finish, slack, criticality, and other schedule movement.
- **Serialization normalization:** Project GUID changes and broad removal/reconstruction of task/resource timephased rows during open/save.
- **Unexpected or context differences:** additional/missing tasks, regenerated assignment identities, and changed resource assignments in the positive reference.

### Decision

The repeated matching-task pattern is sufficient to design an **experimental assigned-task completion profile v0**. It is not sufficient to call that profile minimal or proven. The writer must be implemented in a separate bounded PR after the repository reset, preserve source identities, and be tested first on one assigned task in Microsoft Project.

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
- Project-authored result XML SHA-256:
- reopen/resave XML SHA-256:

### Observed task changes

List task fields that changed.

### Observed assignment changes

List assignment fields that changed.

### Observed timephased changes

List timephased types/values that changed.

### Wider Project consequences

Record summary, successor, project-finish, work, criticality, slack or other changes.

### Reopen result

- Opened successfully:
- Reopened stably:
- Progress displayed as intended:
- Contradictions observed:

### Classification

Separate approved input, semantic companions, Project-calculated consequences, serialization normalization and unexpected differences.

### Decision

State whether the evidence supports a new experimental transaction profile, requires another controlled case, or disproves an existing profile.
