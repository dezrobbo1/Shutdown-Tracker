# UX Anti-Slop Rules

Shutdown Tracker must feel like an operational shutdown execution tool, not a generated SaaS dashboard, project-management clone, or chat app.

This document defines product/design guardrails for future frontend and Codex work.

## Core rule

Operational clarity beats feature display.

The UI should answer:

- what changed;
- what is blocked;
- what is late;
- who owns it;
- what action is next;
- what needs Tier 2 tracking validation or Tier 1 review;
- what is not yet synced;
- what is safe or unsafe for Project handoff.

Anything that does not answer those questions should be pushed down, filtered, scoped to a saved view, or removed from MVP.

## Anti-slop principles

| Principle | Required behaviour |
| --- | --- |
| One job per screen | Do not combine every workflow into one overview wall |
| Attention first | Surface blocked, failed, overdue, awaiting review, export exceptions before passive counts |
| Operational before decorative | Avoid marketing-style headers, glossy cards, excessive icons, and decorative metrics |
| Client/tier-appropriate complexity | Tier 2/Tier 3 see assigned-task actions; Tier 1 sees whole-project control, import/export, and diffs |
| Structured records first | Blockers, actions, evidence, handover, export review, and progress are not comments |
| Visible state, not noise | Use persistent indicators and queues, not popups or badge soup |
| Offline honesty | Never imply queued local work reached the server |
| Project boundary always clear | Export/review/verification screens must state that the master `.mpp` is not updated |

## Do not build these UI patterns in MVP

- Generic dashboard builder.
- Gantt or scheduler view.
- Dependency map.
- Resource levelling screen.
- CPM/float/critical-path visualization.
- Broad analytics portal.
- Generic chat or channels page.
- Private messaging inbox.
- AI copilot panel.
- Wall of pastel cards.
- Badge soup where every state has equal visual weight.
- Large marketing-style hero headers.
- Multiple top-level review/verification/dashboard zones.
- Dense table editing on phone.
- Hidden sync.
- Disabled buttons that look live without visual-only context.

## Navigation freeze

The product-level navigation remains fixed until a future ADR changes it.

Master Console:

```text
Today
Tasks
Critical
Import / Export
Project Settings
```

Mobile App:

```text
Assigned Tasks
```

Problems, Discussion, Actions, Evidence, and History belong inside the relevant Task Dashboard. Mobile uses Task Detail beneath Assigned Tasks. Sync remains a visible transport/recovery state rather than navigation.

## Console Today rules

Today is a high-signal 24-hour project attention surface, not a full workflow dump.

Today should show by default:

- needs attention now;
- blocked work;
- overdue actions;
- failed syncs/uploads;
- awaiting Tier 2 validation where required;
- awaiting Tier 1 approval;
- export exceptions;
- handover due this shift;
- last import/export status.

Today should not show by default:

- full WBS tree;
- full import reconciliation table;
- full export diff table;
- dense evidence gallery;
- full audit log;
- long historical feeds;
- every possible status card;
- scheduler-style visuals.

## Console screen placement rules

| Surface | Placement |
| --- | --- |
| Tier 2 tracking validation | Assigned Task Detail; Today/Tasks attention context for Tier 1 |
| Tier 1 input review | Today summary + Import / Export review surface |
| Project verification | Import / Export |
| Critical reporting | Critical oversight + task/summary-work-pack dashboard |
| Import validation | Import / Export or Project Settings |
| Handover context | Relevant Task Dashboard History/Discussion |
| Needs Response | Today/top chrome/user menu; not generic inbox |
| Communications | Entity detail panels; not top-level chat |

## Mobile Assigned Tasks rules

Assigned Tasks should show assigned work before sync/review metadata.

Minimum viable task card:

- task name;
- task code or short external ID;
- area/work package;
- current execution state;
- planned window if relevant today;
- percent complete if relevant;
- one blocker/evidence indicator;
- one sync indicator;
- one primary action.

Do not put these on every mobile task card by default:

- four or more chips;
- full review lifecycle;
- Tier 1/export terms;
- long comments;
- detailed history;
- all evidence links;
- all blockers/actions;
- oversized buttons that dominate the card.

## Copy rules

Use operational language.

Prefer:

- `Assigned tasks`;
- `Needs Tier 2 validation`;
- `Evidence missing`;
- `Export blocked`;
- `Queued on this device. Not yet sent.`;
- `Tier 1 approval authorises this exact input for an updated Project candidate. The current master schedule is unchanged.`

Avoid:

- `seamless collaboration`;
- `boost productivity`;
- `real-time insights`;
- `AI-powered`;
- `smart dashboard`;
- `chat`;
- `messenger`;
- `thread may be out of date` on progress screens;
- `review scaffold` on end-user-facing screenshots unless clearly labelled for visual review.

## Visual review shell copy

Use one global label for current prototype screens:

```text
Visual review shell. Static/synthetic data. No production write workflow.
```

Avoid repeating `Review mode`, `Review scaffold`, and `Visual state only` in many locations. Repetition makes the UI feel generated and distracts from workflow review.

## Synthetic data rules

Visible sample data should be sanitized but realistic.

Avoid visible labels like:

- `Synthetic Task A1`;
- `Synthetic Summary Mobile`;
- `Tier 3 user A`;
- `Demo record`.

Prefer:

- `C2 Cyclone — remove access cover`;
- `D2 Stack — scaffold inspection`;
- `HV inlet — vacuum clean-out`;
- `Furnace bottom — install blanking plate`;
- `Permit isolation — await operations release`;
- `Crane lift — wait for lift plan sign-off`;
- `Tier 2 user A`;
- `Tier 3 user B`.

## Chip and card rules

Chips are for quick state recognition, not decoration.

Use chips sparingly:

- one execution state;
- one review/export state if relevant;
- one blocker/evidence indicator;
- one sync indicator.

Avoid:

- four or more equal-weight chips on every card;
- unique color treatment for every state;
- long chip text that wraps awkwardly;
- color-only meaning;
- rows of chips replacing structured fields.

Cards should not replace tables where comparison matters. Tier 1 review and export preview should use comparison tables/lists, not only cards.

## Status and notification rules

- Persistent state uses indicators.
- Entry mistakes use validation.
- Interruptions/notifications are only for time-sensitive action.
- Do not notify for every comment or passive status change.
- Use `Needs Response` for accountable attention, not general unread counts.

High-salience states:

- blocked critical work;
- failed sync/evidence upload;
- overdue action;
- awaiting Tier 1 export approval;
- export generation failure;
- re-import conflict;
- Project verification failed.

Low-salience/passive states:

- routine comment;
- server received;
- no blocker;
- evidence ready;
- ordinary progress update that does not need response.

## Accessibility rules

- Use text plus icon/shape/color for state.
- Use visible focus styles.
- Use semantic headings and landmarks.
- Maintain practical touch targets on mobile.
- Do not rely on hover for essential actions.
- Do not require drag-only interactions.
- Keep error and sync states visible without forcing context change.
- Preserve user input after validation failure.

## Codex prompt rules

Every future Codex UI prompt should include:

- do not add top-level navigation without product-doc change;
- do not create a dashboard/card wall;
- do not introduce generic chat;
- do not imply Microsoft Project write-back;
- keep write controls disabled unless APIs exist;
- label static/synthetic surfaces clearly;
- use sanitized realistic examples, not `Synthetic Task A1` labels;
- keep mobile cards minimal;
- use tables/lists for Tier 1 Import / Export comparison;
- include acceptance criteria for IA, sync honesty, and Project boundary.

## UX cleanup acceptance criteria

A UI cleanup is successful when:

- Tier 1 can find the highest-priority blocked/review item quickly;
- Tier 1 can find export-review and Project-verification surfaces under Import / Export;
- Tier 2/Tier 3 sees assigned work before sync/status diagnostics;
- queued/failed/server-received states are explicit but not visually dominant;
- the top-level IA remains stable;
- the UI no longer looks like a generic generated dashboard;
- Project boundary copy remains visible where necessary;
- no screen implies production functionality that does not exist.
