# Mobile App

Purpose: React/Vite mobile-first PWA satellite for Tier 2 and Tier 3 assigned work.

Current status: scaffolded static/synthetic visual shell. It contains hard-coded assigned-work, task-progress, evidence-indicator, comment, and sync-state examples. It has no production assignment, execution, offline queue, discussion, evidence, or review writes.

## Approved application target

```text
Assigned Tasks
  Task Detail
```

Assigned Tasks is the only top-level operational destination.

- Tier 2 sees tasks explicitly assigned by Tier 1 for tracking.
- Tier 2 may assign those tasks to direct-report Tier 3 while retaining tracking responsibility.
- Tier 3 sees tasks explicitly assigned by Tier 2 as `WORKING_ON` or `FIELD_CONTROL`.
- Neither tier may browse the whole project.

Discussion, Delays / Problems, Actions, Evidence, History, and assigned Critical reporting obligations belong inside Task Detail. There is no separate Mobile Today, Problems, Evidence, Sync, or Critical destination.

Sync is a compact, persistent transport/recovery state. Queued, sending, server-received, failed, and conflict states must remain visible without becoming an operational page.

## Current visual-shell limitations

The current source still contains legacy static navigation and review examples. This documentation change does not modify frontend source. A separately reviewed runtime PR must replace those examples with the approved Assigned Tasks / Task Detail shell.

The current Mobile App does not implement:

- OIDC/login;
- Tier 2/Tier 3 project membership;
- direct-report relationships;
- explicit Tracker task assignments;
- task execution-event persistence or APIs;
- event-derived task state;
- production comments/discussion;
- production delays/problems, actions, or evidence;
- IndexedDB/offline queue;
- service-worker/background sync correctness;
- Tier 2 tracking validation writes;
- Tier 1 Project-input review;
- production Critical reporting;
- import/export or Microsoft Project write-back.

All current write-like controls are disabled/read-only and all displayed work/sync data is synthetic.

## Required offline copy

```text
Saved locally.
Queued on this device. Not yet sent.
Could not send. Still saved on this device.
Server received.
This progress update is not submitted until the server receives it.
Last synced at [time].
```

Use `Thread may be out of date. Last synced at [time].` only for future Task Detail discussion, not for task progress.

## Product authority

- `docs/product/product-flow-and-software-map.md`
- `docs/product/user-tier-and-assignment-model.md`
- `docs/product/task-operational-model.md`
- `docs/product/critical-reporting-model.md`
- `docs/product/implementation-status-map.md`
- `docs/product/frontend-visual-review-scope.md`
- `docs/product/offline-audit-sync-rules.md`
- `docs/product/ux-anti-slop-rules.md`
- `docs/product/design-language-and-status-semantics.md`

## Local commands

```text
npm run dev
npm test
npm run build
```
