# Design Language and Status Semantics

Shutdown Tracker should use a restrained operational design language.

The product is used during industrial shutdown execution. Visual certainty, state clarity, and low cognitive load are more important than visual novelty.

## Design principles

| Principle | Rule |
| --- | --- |
| Operational clarity | Every screen should help users decide what to do next |
| Restraint | Use fewer colours, fewer chips, fewer panels, and less decorative chrome |
| Consistency | The same state must look and read the same across console and mobile |
| Accessibility | Never rely on colour alone; maintain focus, text, and target-size rules |
| Client/tier fit | Assigned-task Mobile screens are sparse; Tier 1 Console screens can be denser but still structured |
| Project boundary visibility | Import / Export screens must say that Export is not finalised and that experimental output does not update the master `.mpp` |

## Typography and copy

Use:

- sentence case labels;
- short operational headings;
- plain verbs;
- concrete state language;
- system UI font stack;
- compact page headers.

Avoid:

- marketing-style hero headings;
- all-caps long labels;
- generic SaaS phrases;
- decorative adjectives;
- vague collaboration/productivity claims;
- repeating prototype labels on every card.

Examples:

| Avoid | Use |
| --- | --- |
| Execution review console | Execution review |
| Mobile shell | Assigned tasks |
| Visual state only | Visual review shell. Static/synthetic data. No production write workflow. |
| Thread may be out of date | Last synced at [time] for task/progress surfaces |
| Real-time collaboration | Needs response / assigned action / blocker owner |

## Layout rules

### Console

- Use a compact top status strip for project/shift/import/export/sync context.
- Use Today as a high-signal 24-hour project view for attention queues and exceptions.
- Use Tasks for browsing and task detail.
- Use the Task Dashboard for Discussion, Delays / Problems, Actions, Evidence, and History.
- Use Critical for operational reporting configuration/oversight, not schedule calculation.
- Use Import / Export for current-schedule context and import inspection/review. Keep Export visibly not finalised under [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md).
- Use Project Settings for membership, direct reports, mappings, time settings, and lifecycle.
- Use tables/lists for comparison and review.
- Use cards only for summary/attention blocks or mobile-style surfaces.
- Use drawers or detail pages for deep record detail.
- Avoid horizontal overflow in default layouts.

### Mobile

- Assigned Tasks is the only top-level operational destination.
- Show assigned work before diagnostics.
- Use a compact sync banner.
- Use cards for work items.
- Keep forms short.
- Keep primary actions thumb-friendly.
- Put evidence and delay/problem shortcuts inside Task Detail near execution actions.
- Push history and review metadata into detail screens.

## Status classes

Use a small semantic palette. Do not create a new colour for every state.

| Class | Use | Examples |
| --- | --- | --- |
| Neutral | Context, unavailable, no issue, archived | Not started, No blocker, Context only |
| Info | Active but not urgent | In progress, Server received, Review context |
| Warning | Needs attention but not critical failure | Needs Tier 2 validation, Needs Tier 1 review, Queued, Evidence pending, Paused |
| Critical | Work blocked, failed, unsafe, or in conflict | Blocked, Failed, Conflict, Evidence missing, Re-import conflict |
| Success | Accepted, reviewed, complete, received | Tier 2 validated, Tier 1 reviewed, Import accepted, Completed |
| Restricted | Read-only, unavailable, or policy-blocked state | Export not finalised, Assignment restricted, Tier 1 only |

## Domain state mapping

### Execution state and operational condition

| State | Class | Notes |
| --- | --- | --- |
| Not Started | Neutral | No imported or Tracker evidence of start, and not complete |
| In Progress | Info | Imported start/progress evidence or an active Tracker-event projection |
| Paused | Warning | Temporary stop; reason required |
| Completed | Success | Imported completion or Tracker completion; may still need review/evidence |

Blocked/delayed context is a structured operational condition kept separate from the execution projection:

| Condition | Class | Notes |
| --- | --- | --- |
| Late to Start | Warning | Planned start passed without valid start evidence |
| Delayed / blocked before start | Critical | Can't Start context; execution remains Not Started |
| Adverse delay / blocked | Critical | Linked pause/delay/problem context; do not hide the governing pause interval |
| Running beyond planned finish | Warning/Critical | Attention only; class depends on operational impact |

Readiness, blocked/delayed condition, and schedule variance are separate from execution state. A planned start passing, a task appearing in Today, a Can't Start observation, or a task being ready to start does not establish **In Progress**. See [Task Operational Model](task-operational-model.md) for the authoritative derivation.

### Mobile execution action copy

Use exactly these ordinary action labels:

```text
Can't Start / Start / Pause / Resume / Finish
```

- Show that the event time is recorded automatically when the action is confirmed; do not show ordinary editable Actual Start/Actual Finish or execution date/time inputs.
- Show late-start cause/action fields only when Start is late, unless a later project policy explicitly adds another requirement.
- After Pause, immediately show the pause reason and whether it is an adverse delay; do not classify every Pause as adverse.
- On Resume, ask whether a linked issue is resolved or work resumed while it remains open; do not silently close it.
- Use a concise Finish confirmation; request evidence only when configured policy requires it.
- Keep each contextual workflow short and progressively disclosed rather than presenting all action fields at once.

At end of shift, ask **How much of the task is complete?** and use plain field language for completion, remaining work, next-shift issue, and optional note/evidence. Do not expose `% Work Complete` or `Physical % Complete` terminology to ordinary Mobile users.

### Critical reporting presentation

- Console Critical shows the reporting owner, policy/template and version, timing mechanisms/triggers, supported required content, due state, latest report, condition, and history.
- Tier 2 sees an assigned obligation in task/work-pack context with known execution facts pre-populated and only the remaining judgement/input fields exposed.
- Routine reporting is not shown as mandatory for every task.
- Configuration uses the controlled supported-field catalogue; never render an arbitrary schema editor or generic form builder.

### Progress review state

| State | Class | Notes |
| --- | --- | --- |
| Draft | Neutral | Not submitted |
| Submitted | Info | Server received, review pending |
| Needs Tier 2 validation | Warning | Tier 2 action required where project policy enables validation |
| Tier 2 validated | Success | Operationally credible, not Project-input approval |
| Correction requested | Warning | Assigned user/Tier 2 action needed |
| Rejected | Critical | Not accepted |
| Superseded | Neutral | Replaced by newer record |

### Tier 1 operational-review state

| State | Class | Notes |
| --- | --- | --- |
| Needs Tier 1 review | Warning | Tier 1 decision required |
| Tier 1 reviewed | Success | Operational review recorded; no Project export authority is implied |
| Tier 1 rejected | Critical | Operational record was not accepted |

### Import / Export trial state

| State | Class | Notes |
| --- | --- | --- |
| Current source | Info | Immutable accepted source/snapshot context |
| Import needs review | Warning | Validation, structure, mapping, or lineage decision required |
| Import accepted | Success | New immutable snapshot accepted; no Project master write is implied |
| Export not finalised | Restricted | No active product export contract or enabled production workflow |
| Experimental export infrastructure | Neutral | Retained technical capability only; not product authority or proof of readiness |

### Sync state

| State | Class | Required copy |
| --- | --- | --- |
| Local draft | Neutral | Saved locally. |
| Queued on device | Warning | Queued on this device. Not yet sent. |
| Sending | Info | Sending. |
| Server received | Success | Server received. |
| Failed | Critical | Could not send. Still saved on this device. |
| Conflict | Critical | Conflict needs review. |

## Project boundary and export-deferral copy

Use clear boundary copy where Import / Export or retained experimental infrastructure is shown.

```text
Export design not finalised. No production Project update workflow is enabled.
Imported Project source and snapshot remain unchanged.
Experimental export infrastructure does not update the master .mpp and is not current product authority.
```

## Chip usage rules

Chips should communicate state quickly but not become the whole interface.

Use chips for:

- execution state;
- operational review or import state;
- sync state;
- blocker/evidence state;
- restricted or unavailable state.

Do not use chips for:

- long explanations;
- every available field;
- actions;
- ownership;
- task names;
- general notes.

Maximum default chips:

| Surface | Max default chips |
| --- | --- |
| Mobile task card | 2-3 |
| Console summary card | 2 |
| Tier 1 review row | 2-4 when record comparison is the task |
| Task detail | As needed, grouped by state dimension |

## Component guidance

| Component | Use | Avoid |
| --- | --- | --- |
| StatusChip | Short state label | Long text, colour-only state |
| BoundaryNotice | Project/import/export/offline warnings | Repeating on every low-risk panel |
| ReviewQueue | Needs action list | Generic dashboard card grid |
| ProgressComparisonTable | Old/new/source value comparison | Card-only comparison |
| SyncBanner | Compact mobile/console sync summary | Oversized top diagnostic tiles |
| TaskCard | Mobile assigned work | Full review/import/export lifecycle on every card |
| TaskDashboardSection | Console task/problem/evidence detail | Detached modal sprawl |
| DataTable | Tier 1 review | Spreadsheet-like inline editing across many columns |
| CriticalPolicySummary | Policy version, timing/triggers, supported required content | Generic form-builder or arbitrary field-schema controls |

## Empty, loading, and error states

Every screen must show safe states.

| State | Required behaviour |
| --- | --- |
| Empty | Explain what is absent and what action, if any, is next |
| Loading | Do not hide previously visible critical state unless stale indicator is shown |
| Error | Show what failed, what remains saved, and how to retry |
| Offline | Show what is available and what cannot be submitted yet |
| Read-only | Say why write controls are unavailable |
| Visual-only | Say no production write workflow exists |

## Accessibility rules

- State is text first, colour second.
- Icons are supplemental, not sole indicators.
- All controls require visible focus.
- Mobile touch targets should be practical for field use.
- Status changes must be conveyed programmatically where relevant.
- Error messages must identify the field/action and recovery path.
- Do not use tiny icon-only controls for task state changes.
- Do not require drag-only interactions for critical actions.

## Review checklist

Before accepting a frontend visual PR, confirm:

- top-level navigation remains within approved IA;
- state labels follow this status model;
- Mobile Assigned Tasks shows work before diagnostics;
- console Today prioritizes attention and exceptions;
- Tier 1 import review uses clear source/structure comparison where relevant;
- Export is visibly not finalised and retained experimental controls cannot be mistaken for product authority;
- queued/failed/server-received states are explicit;
- ordinary Mobile execution timestamps are system-captured rather than editable;
- Can't Start leaves execution Not Started and blocked/delayed context remains separate;
- Critical configuration uses the supported catalogue rather than a generic form builder;
- no screen implies hidden `.mpp` update;
- no screen introduces scheduler visuals or chat;
- synthetic labels are sanitized and realistic;
- controls that are not wired are disabled or explicitly visual-only.
