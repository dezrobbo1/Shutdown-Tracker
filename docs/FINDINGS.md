# Findings

## Confirmed

- A complete Microsoft Project XML file can contain mutually contradictory task, assignment, and timephased progress state.
- Setting only task `PercentComplete`, `ActualStart`, and `ActualFinish` is not sufficient to complete assigned tasks coherently.
- XML validity, source preservation, task identity, library readback, and successful file generation do not prove Microsoft Project semantic compatibility.
- User-authorised execution input must be distinguished from the dependent XML transaction and from later Project-calculated consequences.
- Project GUID and other save/session metadata can change during a valid round trip.
- Microsoft Project can substantially normalize timephased serialization during open/recalculate/save.

## Assigned completion v0 — proven

The lightweight browser implementation has now passed the real BOILER UID `43` Microsoft Project trial.

The browser-generated candidate was accepted and recalculated by Microsoft Project desktop build `16.0.20228.20188`. UID `43` persisted as a coherent 100% completed assigned task, the schedule was saved as MPP, closed, reopened, and the completion remained intact.

The proven scope is deliberately narrow:

- one previously unstarted assigned leaf task;
- exactly one assignment;
- exactly one assignment timephased work block;
- 100% completion;
- Actual Start equal to planned Start;
- Actual Finish equal to planned Finish.

### Browser-authored task closure

- `PercentComplete = 100`
- `PercentWorkComplete = 100`
- Actual Start / Actual Finish
- Actual Duration = planned Duration
- Actual Work = planned Work
- Remaining Duration / Remaining Work = zero
- Stop / Resume = Actual Finish

### Browser-authored existing assignment closure

- `PercentWorkComplete = 100`
- Actual Start / Actual Finish
- Actual Work = assignment Work
- Remaining Work = zero
- Stop / Resume = Actual Finish
- existing Type 1 assignment timephased work converted to Type 2 over the same source interval, Unit and Value

### Type 11 conclusion

The browser writer does **not** author direct task Type 11 timephasing. Microsoft Project generated the task Type 11 progress row during recalculation/save. Type 11 is therefore result-side Project evidence, not a required Tracker-authored input for this proven shape.

## Project scheduling foundations

For the successful UID `43` round trip:

- Project Start remained `2026-09-13T19:00:00`;
- Status Date remained `2025-05-09T17:00:00`;
- Project Calendar UID remained `1`;
- default Start/Finish remained `07:00` / `17:00`;
- minutes/day remained `600`;
- minutes/week remained `2400`;
- days/month remained `20`;
- common calendar working definitions remained semantically stable.

Microsoft Project recalculated Project Finish from `2026-09-24T21:00:00` to `2026-10-03T20:00:00`. That is a Project-calculated schedule consequence, not evidence that Tracker moved the project start, status date, or scheduling calendar.

Current Date changed from `2026-07-30T08:00:00` to `2026-08-28T08:00:00` and is classified as save/session metadata.

The result contains one additional Project-generated calendar, UID `51` (`WC-GENER`, base UID `20`), alongside broader resource/assignment normalization. The browser writer must not generate or copy this result-side identity.

## Known Project-calculated/save consequences

The successful browser round trip and the independently proven Claude round trip establish that the comparator must distinguish authored input from:

- summary ancestor roll-up;
- resource Percent Work Complete / Actual Work / Remaining Work roll-up;
- slack, late-date and Critical recalculation;
- project-finish movement;
- Project Name/GUID/LastSaved/CurrentDate save metadata;
- assignment/resource identity regeneration in Project-saved representations;
- broad timephased serialization normalization;
- numerically equal signed-zero strings such as `0.00` and `-0.00`.

These are comparison/classification rules, not exporter fields.

## Current profile status

| Profile | Status | Use |
|---|---|---|
| Intent log only | Baseline | Measure native open/save normalization without progress edits |
| Task scalar diagnostic | Disproved for assigned-task completion | Reproduce the failed three-field mechanism only |
| Assigned-task completion native-evidence v0 | **Microsoft Project-verified for the bounded UID 43 shape** | May merge with current fail-closed restrictions |
| Partial assigned-task progress | Not proven | Remains blocked pending native evidence |
| Mark on Track | Not proven | Remains a separate native experiment |

## Implementation boundary

The v0 writer must retain its existing fail-closed restrictions. It preserves source task GUID, assignment UID, Resource UID, interval, Unit, Value, dependencies, calendars, resources, baselines, summaries, and unrelated XML content. It does not implement partial progress, Mark on Track, pauses, multiple assignments, off-plan actuals, split tasks, or schedule calculation.

## Repository decision

PR #75 has satisfied its native merge gate for the tested shape. After exact-head CI and final review, it may be merged.

The next interoperability work must remain evidence-first. Do not generalize v0 into partial progress or Mark on Track without separate Project-authored/native round-trip evidence.
